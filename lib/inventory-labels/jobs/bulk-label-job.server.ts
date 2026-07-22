import "server-only";

import { waitUntil } from "@vercel/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { DEFAULT_LABEL_PRESET, getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { parseLabelJobPreset, formatLabelJobPreset } from "@/lib/inventory-labels/validation";
import { buildInventoryQrUrl } from "@/lib/inventory-labels/domain/tokens";
import { ensureActiveTokensForEntities } from "@/lib/inventory-labels/domain/tokens-batch.server";
import { labelPayloadFromMagazzinoRow, magazzinoRicambioEntityType } from "@/lib/inventory-labels/domain/ricambio-payload.server";
import { renderMultiLabelPdfWithPipeline } from "@/lib/inventory-labels/render/pdf";
import {
  buildExpandedPdfSlots,
  renderBulkLabelPdfWithCache,
  uniqueBulkEntityIds,
  type BulkLabelItem,
} from "@/lib/inventory-labels/render/bulk-assembly.server";
import {
  parseJobBulkItems,
  totalBulkLabelCount,
  type BulkLabelCompactItem,
} from "@/lib/inventory-labels/domain/bulk-items";
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
  compact: readonly BulkLabelCompactItem[],
  userId: string,
  origin: string,
): Promise<BuildBulkLabelItemsResult> {
  const entityIds = uniqueBulkEntityIds(compact);
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
  const canonicalOrigin = origin.replace(/\/+$/, "");
  const items: BulkLabelItem[] = foundIds.map((id) => {
    const row = byId.get(id)!;
    const token = tokens.get(id);
    if (!token) throw new Error(`Token mancante per ricambio ${id}`);
    return {
      entityId: id,
      entityType,
      payload: labelPayloadFromMagazzinoRow(row),
      qrUrl: buildInventoryQrUrl(token, canonicalOrigin),
      canonicalOrigin,
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
  compact: BulkLabelCompactItem[],
  uniqueItems: BulkLabelItem[],
  preset: string,
  includeBarcode: boolean,
  jobId: string | null,
  onProgress?: (done: number, total: number) => void | Promise<void>,
) {
  const heartbeat = jobId ? () => touchLabelJobHeartbeat(sb, jobId) : async () => {};

  try {
    return await renderBulkLabelPdfWithCache(sb, template, compact, uniqueItems, preset, {
      includeBarcode,
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
    const slots = buildExpandedPdfSlots(compact, uniqueItems, template, preset, includeBarcode);
    const result = await renderMultiLabelPdfWithPipeline(template, slots, {
      includeBarcode,
      onProgress: async (done, total) => {
        await heartbeat();
        await onProgress?.(done, total);
      },
    });
    return {
      ...result,
      cacheHitCount: 0,
      cacheMissCount: uniqueItems.length,
      uniqueRenderCount: uniqueItems.length,
    };
  }
}

export async function createBulkLabelJob(input: {
  items: BulkLabelCompactItem[];
  preset: string;
  includeBarcode?: boolean;
  userId: string;
  origin: string;
}): Promise<string> {
  const sb = await createSupabaseServerUserClient();
  const now = new Date().toISOString();
  const storedPreset = formatLabelJobPreset(input.preset, input.includeBarcode === true);
  const entityIds = uniqueBulkEntityIds(input.items);
  const { data, error } = await sb
    .from("label_generation_jobs")
    .insert({
      status: "pending",
      progress: 0,
      entity_ids: entityIds,
      bulk_items: input.items,
      preset: storedPreset,
      format: "pdf",
      created_by: input.userId,
      started_at: now,
      heartbeat_at: now,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const jobId = String(data.id);
  waitUntil(processBulkLabelJob(jobId, { ...input, preset: storedPreset }));
  return jobId;
}

async function processBulkLabelJob(
  jobId: string,
  input: { items: BulkLabelCompactItem[]; preset: string; includeBarcode?: boolean; userId: string; origin: string },
): Promise<void> {
  const sb = createSupabaseServerServiceClient();
  const t0 = performance.now();
  const totalLabels = totalBulkLabelCount(input.items);

  try {
    const now = new Date().toISOString();
    await sb
      .from("label_generation_jobs")
      .update({ status: "running", progress: 0, started_at: now, heartbeat_at: now })
      .eq("id", jobId);
    await auditBulkPdfStarted(sb, { userId: input.userId, count: totalLabels, mode: "async", jobId });

    const { preset, includeBarcode } = parseLabelJobPreset(input.preset);
    const template = getLabelTemplate(preset);
    if (!template) throw new Error("Template non valido");

    const { items: uniqueItems } = await buildBulkLabelItems(sb, input.items, input.userId, input.origin);
    await touchLabelJobHeartbeat(sb, jobId, { progress: 5 });
    if (!uniqueItems.length) throw new Error("Nessun ricambio valido per la stampa");

    const result = await renderBulkPdf(
      sb,
      template,
      input.items,
      uniqueItems,
      preset,
      includeBarcode,
      jobId,
      async (done, total) => {
        const rasterProgress = Math.floor((done / total) * 90);
        await updateJobProgress(sb, jobId, Math.max(5, rasterProgress));
      },
    );

    await touchLabelJobHeartbeat(sb, jobId, { progress: 95 });

    const hash = createHash("sha256")
      .update(JSON.stringify(input.items))
      .digest("hex")
      .slice(0, 16);
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
      count: totalLabels,
      mode: "async",
      durationMs,
      pdfBytes: result.bytes.byteLength,
      pipeline: result.pipeline,
      jobId,
      metrics: buildLabelPdfMetricsPayload({
        labelCount: totalLabels,
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
      count: totalLabels,
      mode: "async",
      durationMs,
      errorCode,
      message,
      jobId,
      metrics: buildLabelPdfMetricsPayload({
        labelCount: totalLabels,
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
  const items =
    parseJobBulkItems(job.bulk_items).length > 0
      ? parseJobBulkItems(job.bulk_items)
      : parseJobBulkItems(job.entity_ids);
  const { preset, includeBarcode } = parseLabelJobPreset(String(job.preset ?? DEFAULT_LABEL_PRESET));
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
  waitUntil(
    processBulkLabelJob(jobId, {
      items,
      preset: formatLabelJobPreset(preset, includeBarcode),
      userId: input.userId,
      origin: input.origin,
    }),
  );
}

export async function renderBulkLabelPdfSync(input: {
  items: BulkLabelCompactItem[];
  preset: string;
  includeBarcode?: boolean;
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
  totalLabels: number;
}> {
  const sb = await createSupabaseServerUserClient();
  const template = getLabelTemplate(input.preset);
  if (!template) throw new Error("Template non valido");
  const includeBarcode = input.includeBarcode === true;
  const totalLabels = totalBulkLabelCount(input.items);

  const { items: uniqueItems, skippedIds } = await buildBulkLabelItems(sb, input.items, input.userId, input.origin);
  if (!uniqueItems.length) throw new Error("Nessun ricambio valido");

  const t0 = performance.now();
  await auditBulkPdfStarted(sb, { userId: input.userId, count: totalLabels, mode: "sync" });

  try {
    const result = await renderBulkPdf(sb, template, input.items, uniqueItems, input.preset, includeBarcode, null);
    const durationMs = Math.round(performance.now() - t0);
    await auditBulkPdfCompleted(sb, {
      userId: input.userId,
      count: totalLabels,
      mode: "sync",
      durationMs,
      pdfBytes: result.bytes.byteLength,
      pipeline: result.pipeline,
      metrics: buildLabelPdfMetricsPayload({
        labelCount: totalLabels,
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
      totalLabels,
    };
  } catch (e) {
    const errorCode = e instanceof LabelPdfTimeoutError ? e.code : "LABEL_PDF_FAILED";
    const message = e instanceof Error ? e.message : "Generazione fallita";
    const durationMs = Math.round(performance.now() - t0);
    await auditBulkPdfFailed(sb, {
      userId: input.userId,
      count: totalLabels,
      mode: "sync",
      durationMs,
      errorCode,
      message,
      metrics: buildLabelPdfMetricsPayload({
        labelCount: totalLabels,
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
