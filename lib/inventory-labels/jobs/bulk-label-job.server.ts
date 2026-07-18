import "server-only";

import { waitUntil } from "@vercel/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { DEFAULT_LABEL_PRESET, getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { buildInventoryQrUrl } from "@/lib/inventory-labels/domain/tokens";
import { ensureActiveTokensForEntities } from "@/lib/inventory-labels/domain/tokens-batch.server";
import { labelPayloadFromMagazzinoRow, magazzinoRicambioEntityType } from "@/lib/inventory-labels/domain/ricambio-payload.server";
import { renderMultiLabelPdfWithPipeline } from "@/lib/inventory-labels/render/pdf";
import {
  renderBulkLabelPdfWithCache,
  type BulkLabelItem,
} from "@/lib/inventory-labels/render/bulk-assembly.server";
import { LabelPdfTimeoutError } from "@/lib/inventory-labels/render/pdf-timeout";
import {
  auditBulkPdfCompleted,
  auditBulkPdfFailed,
  auditBulkPdfStarted,
} from "@/lib/inventory-labels/audit/bulk-pdf-audit.server";
import { buildLabelPdfMetricsPayload } from "@/lib/inventory-labels/observability/label-pdf-metrics";
import { uploadBulkLabelJobResult } from "@/lib/inventory-labels/storage/artifacts.server";
import {
  recoverStuckLabelJobs,
  touchLabelJobHeartbeat,
} from "@/lib/inventory-labels/jobs/label-job-recovery.server";
import { MAGAZZINO_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import { createHash } from "node:crypto";

export type BuildBulkLabelItemsResult = {
  items: BulkLabelItem[];
  skippedIds: string[];
};

export async function buildBulkLabelItems(
  sb: SupabaseClient,
  entityIds: string[],
  userId: string,
  origin: string,
): Promise<BuildBulkLabelItemsResult> {
  const { data: rows, error } = await sb
    .from("magazzino_ricambi")
    .select(MAGAZZINO_RICAMBI_COLUMNS)
    .in("id", entityIds);
  if (error) throw new Error(error.message);

  const byId = new Map((rows as MagazzinoRicambioRow[]).map((r) => [r.id, r]));
  const entityType = magazzinoRicambioEntityType();
  const foundIds = entityIds.filter((id) => byId.has(id));
  const skippedIds = entityIds.filter((id) => !byId.has(id));

  const tokens = await ensureActiveTokensForEntities(sb, entityType, foundIds, userId);
  const items: BulkLabelItem[] = foundIds.map((id) => {
    const row = byId.get(id)!;
    const token = tokens.get(id);
    if (!token) throw new Error(`Token mancante per ricambio ${id}`);
    return {
      entityId: id,
      entityType,
      payload: labelPayloadFromMagazzinoRow(row),
      qrUrl: buildInventoryQrUrl(token, origin),
    };
  });

  return { items, skippedIds };
}

async function updateJobProgress(sb: SupabaseClient, jobId: string, progress: number): Promise<void> {
  await touchLabelJobHeartbeat(sb, jobId, { progress });
}

async function renderBulkPdf(
  sb: SupabaseClient,
  template: NonNullable<ReturnType<typeof getLabelTemplate>>,
  items: BulkLabelItem[],
  preset: string,
  jobId: string | null,
  onProgress?: (done: number, total: number) => void | Promise<void>,
) {
  const heartbeat = jobId ? () => touchLabelJobHeartbeat(sb, jobId) : async () => {};

  try {
    return await renderBulkLabelPdfWithCache(sb, template, items, preset, {
      chunkSize: 25,
      onChunkHeartbeat: heartbeat,
      onProgress: async (done, total) => {
        await heartbeat();
        await onProgress?.(done, total);
      },
    });
  } catch (cacheError) {
    console.warn("[label-pdf] cache assembly failed, fallback pipeline", {
      message: cacheError instanceof Error ? cacheError.message : String(cacheError),
    });
    const pipelineItems = items.map((it) => ({ payload: it.payload, qrUrl: it.qrUrl }));
    const result = await renderMultiLabelPdfWithPipeline(template, pipelineItems, {
      onProgress: async (done, total) => {
        await heartbeat();
        await onProgress?.(done, total);
      },
    });
    return {
      ...result,
      cacheHitCount: 0,
      cacheMissCount: items.length,
    };
  }
}

export async function createBulkLabelJob(input: {
  entityIds: string[];
  preset: string;
  userId: string;
  origin: string;
}): Promise<string> {
  const sb = await createSupabaseServerUserClient();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("label_generation_jobs")
    .insert({
      status: "pending",
      progress: 0,
      entity_ids: input.entityIds,
      preset: input.preset,
      format: "pdf",
      created_by: input.userId,
      started_at: now,
      heartbeat_at: now,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const jobId = String(data.id);
  waitUntil(processBulkLabelJob(jobId, input));
  return jobId;
}

async function processBulkLabelJob(
  jobId: string,
  input: { entityIds: string[]; preset: string; userId: string; origin: string },
): Promise<void> {
  const sb = createSupabaseServerServiceClient();
  const t0 = performance.now();
  const count = input.entityIds.length;

  try {
    const now = new Date().toISOString();
    await sb
      .from("label_generation_jobs")
      .update({ status: "running", progress: 0, started_at: now, heartbeat_at: now })
      .eq("id", jobId);
    await auditBulkPdfStarted(sb, { userId: input.userId, count, mode: "async", jobId });

    const template = getLabelTemplate(input.preset);
    if (!template) throw new Error("Template non valido");

    const { items } = await buildBulkLabelItems(sb, input.entityIds, input.userId, input.origin);
    await touchLabelJobHeartbeat(sb, jobId, { progress: 5 });
    if (!items.length) throw new Error("Nessun ricambio valido per la stampa");

    const result = await renderBulkPdf(sb, template, items, input.preset, jobId, async (done, total) => {
      const rasterProgress = Math.floor((done / total) * 90);
      await updateJobProgress(sb, jobId, Math.max(5, rasterProgress));
    });

    await touchLabelJobHeartbeat(sb, jobId, { progress: 95 });

    const hash = createHash("sha256").update(input.entityIds.join(",")).digest("hex").slice(0, 16);
    const isZip = result.kind === "zip";
    const path = await uploadBulkLabelJobResult({
      jobId,
      hash,
      bytes: result.bytes,
      contentType: isZip ? "application/zip" : "application/pdf",
    });

    const durationMs = Math.round(performance.now() - t0);
    const completedAt = new Date().toISOString();
    await sb
      .from("label_generation_jobs")
      .update({
        status: "completed",
        progress: 100,
        format: isZip ? "zip" : "pdf",
        result_storage_path: path,
        completed_at: completedAt,
        heartbeat_at: completedAt,
      })
      .eq("id", jobId);

    await auditBulkPdfCompleted(sb, {
      userId: input.userId,
      count,
      mode: "async",
      durationMs,
      pdfBytes: result.bytes.byteLength,
      pipeline: result.pipeline,
      jobId,
      metrics: buildLabelPdfMetricsPayload({
        labelCount: items.length,
        cacheHitCount: result.cacheHitCount,
        cacheMissCount: result.cacheMissCount,
        durationMs,
        outcome: "ok",
        pipeline: result.pipeline,
        mode: "async",
      }),
    });
  } catch (e) {
    const errorCode =
      e instanceof LabelPdfTimeoutError ? e.code : e instanceof Error && /sharp|OOM|memory/i.test(e.message) ? "LABEL_PDF_RASTER_FAILED" : "LABEL_PDF_FAILED";
    const message = e instanceof Error ? e.message : "Generazione fallita";
    const completedAt = new Date().toISOString();
    await sb
      .from("label_generation_jobs")
      .update({
        status: "failed",
        error: message,
        error_code: errorCode,
        completed_at: completedAt,
        heartbeat_at: completedAt,
      })
      .eq("id", jobId);
    const durationMs = Math.round(performance.now() - t0);
    await auditBulkPdfFailed(sb, {
      userId: input.userId,
      count,
      mode: "async",
      durationMs,
      errorCode,
      message,
      jobId,
      metrics: buildLabelPdfMetricsPayload({
        labelCount: count,
        cacheHitCount: 0,
        cacheMissCount: 0,
        durationMs,
        outcome: "failed",
        errorCode,
        mode: "async",
      }),
    });
  }
}

export async function getBulkLabelJob(jobId: string) {
  const sb = await createSupabaseServerUserClient();
  await recoverStuckLabelJobs(sb);
  const { data, error } = await sb.from("label_generation_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function retryBulkLabelJob(
  jobId: string,
  input: { userId: string; origin: string },
): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { data: job, error } = await sb.from("label_generation_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!job) throw new Error("Job non trovato");
  if (job.status !== "failed" || job.error_code !== "LABEL_JOB_STUCK") {
    throw new Error("Retry consentito solo per job bloccati");
  }
  const entityIds = Array.isArray(job.entity_ids) ? (job.entity_ids as string[]) : [];
  const preset = String(job.preset ?? DEFAULT_LABEL_PRESET);
  const now = new Date().toISOString();
  await sb
    .from("label_generation_jobs")
    .update({
      status: "pending",
      progress: 0,
      error: null,
      error_code: null,
      completed_at: null,
      result_storage_path: null,
      started_at: now,
      heartbeat_at: now,
    })
    .eq("id", jobId);
  waitUntil(processBulkLabelJob(jobId, { entityIds, preset, userId: input.userId, origin: input.origin }));
}

export async function renderBulkLabelPdfSync(input: {
  entityIds: string[];
  preset: string;
  userId: string;
  origin: string;
}): Promise<{
  bytes: Uint8Array;
  contentType: string;
  pipeline: string;
  skippedIds: string[];
  cacheHitCount: number;
  cacheMissCount: number;
  durationMs: number;
}> {
  const sb = await createSupabaseServerUserClient();
  const template = getLabelTemplate(input.preset);
  if (!template) throw new Error("Template non valido");

  const { items, skippedIds } = await buildBulkLabelItems(sb, input.entityIds, input.userId, input.origin);
  if (!items.length) throw new Error("Nessun ricambio valido");

  const t0 = performance.now();
  const count = items.length;
  await auditBulkPdfStarted(sb, { userId: input.userId, count, mode: "sync" });

  try {
    const result = await renderBulkPdf(sb, template, items, input.preset, null);
    const durationMs = Math.round(performance.now() - t0);
    await auditBulkPdfCompleted(sb, {
      userId: input.userId,
      count,
      mode: "sync",
      durationMs,
      pdfBytes: result.bytes.byteLength,
      pipeline: result.pipeline,
      metrics: buildLabelPdfMetricsPayload({
        labelCount: count,
        cacheHitCount: result.cacheHitCount,
        cacheMissCount: result.cacheMissCount,
        durationMs,
        outcome: "ok",
        pipeline: result.pipeline,
        mode: "sync",
      }),
    });
    const contentType = result.kind === "zip" ? "application/zip" : "application/pdf";
    return {
      bytes: result.bytes,
      contentType,
      pipeline: result.pipeline,
      skippedIds,
      cacheHitCount: result.cacheHitCount,
      cacheMissCount: result.cacheMissCount,
      durationMs,
    };
  } catch (e) {
    const errorCode = e instanceof LabelPdfTimeoutError ? e.code : "LABEL_PDF_FAILED";
    const message = e instanceof Error ? e.message : "Generazione fallita";
    const durationMs = Math.round(performance.now() - t0);
    await auditBulkPdfFailed(sb, {
      userId: input.userId,
      count,
      mode: "sync",
      durationMs,
      errorCode,
      message,
      metrics: buildLabelPdfMetricsPayload({
        labelCount: count,
        cacheHitCount: 0,
        cacheMissCount: 0,
        durationMs,
        outcome: "failed",
        errorCode,
        mode: "sync",
      }),
    });
    throw e;
  }
}
