import "server-only";

import { waitUntil } from "@vercel/functions";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { buildInventoryQrUrl } from "@/lib/inventory-labels/domain/tokens";
import { ensureActiveInventoryToken } from "@/lib/inventory-labels/domain/tokens.server";
import { labelPayloadFromMagazzinoRow, magazzinoRicambioEntityType } from "@/lib/inventory-labels/domain/ricambio-payload.server";
import { renderMultiLabelPdfWithPipeline } from "@/lib/inventory-labels/render/pdf";
import { LabelPdfTimeoutError } from "@/lib/inventory-labels/render/pdf-timeout";
import {
  auditBulkPdfCompleted,
  auditBulkPdfFailed,
  auditBulkPdfStarted,
} from "@/lib/inventory-labels/audit/bulk-pdf-audit.server";
import { uploadBulkLabelJobResult } from "@/lib/inventory-labels/storage/artifacts.server";
import { MAGAZZINO_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import { createHash } from "node:crypto";

async function buildBulkLabelItems(
  sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>,
  entityIds: string[],
  userId: string,
  origin: string,
): Promise<Array<{ payload: ReturnType<typeof labelPayloadFromMagazzinoRow>; qrUrl: string }>> {
  const { data: rows, error } = await sb
    .from("magazzino_ricambi")
    .select(MAGAZZINO_RICAMBI_COLUMNS)
    .in("id", entityIds);
  if (error) throw new Error(error.message);

  const byId = new Map((rows as MagazzinoRicambioRow[]).map((r) => [r.id, r]));
  const entityType = magazzinoRicambioEntityType();

  const items = await Promise.all(
    entityIds.map(async (id) => {
      const row = byId.get(id);
      if (!row) return null;
      const tokenRow = await ensureActiveInventoryToken(sb, entityType, id, userId);
      return {
        payload: labelPayloadFromMagazzinoRow(row),
        qrUrl: buildInventoryQrUrl(tokenRow.token, origin),
      };
    }),
  );

  return items.filter((item): item is NonNullable<typeof item> => item != null);
}

async function updateJobProgress(sb: Awaited<ReturnType<typeof createSupabaseServerUserClient>>, jobId: string, progress: number): Promise<void> {
  await sb.from("label_generation_jobs").update({ progress }).eq("id", jobId);
}

export async function createBulkLabelJob(input: {
  entityIds: string[];
  preset: string;
  userId: string;
  origin: string;
}): Promise<string> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("label_generation_jobs")
    .insert({
      status: "pending",
      progress: 0,
      entity_ids: input.entityIds,
      preset: input.preset,
      format: "pdf",
      created_by: input.userId,
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
  const sb = await createSupabaseServerUserClient();
  const t0 = performance.now();
  const count = input.entityIds.length;

  try {
    await sb.from("label_generation_jobs").update({ status: "running", progress: 0 }).eq("id", jobId);
    await auditBulkPdfStarted(sb, { userId: input.userId, count, mode: "async", jobId });

    const template = getLabelTemplate(input.preset);
    if (!template) throw new Error("Template non valido");

    const items = await buildBulkLabelItems(sb, input.entityIds, input.userId, input.origin);
    if (!items.length) throw new Error("Nessun ricambio valido per la stampa");

    await updateJobProgress(sb, jobId, 5);

    const result = await renderMultiLabelPdfWithPipeline(template, items, {
      onProgress: async (done, total) => {
        const rasterProgress = Math.floor((done / total) * 90);
        await updateJobProgress(sb, jobId, Math.max(5, rasterProgress));
      },
    });

    const hash = createHash("sha256").update(input.entityIds.join(",")).digest("hex").slice(0, 16);
    const isZip = result.kind === "zip";
    const path = await uploadBulkLabelJobResult({
      jobId,
      hash,
      bytes: result.bytes,
      contentType: isZip ? "application/zip" : "application/pdf",
    });

    await sb
      .from("label_generation_jobs")
      .update({
        status: "completed",
        progress: 100,
        format: isZip ? "zip" : "pdf",
        result_storage_path: path,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await auditBulkPdfCompleted(sb, {
      userId: input.userId,
      count,
      mode: "async",
      durationMs: Math.round(performance.now() - t0),
      pdfBytes: result.bytes.byteLength,
      pipeline: result.pipeline,
      jobId,
    });
  } catch (e) {
    const errorCode =
      e instanceof LabelPdfTimeoutError ? e.code : e instanceof Error && /sharp|OOM|memory/i.test(e.message) ? "LABEL_PDF_RASTER_FAILED" : "LABEL_PDF_FAILED";
    const message = e instanceof Error ? e.message : "Generazione fallita";
    await sb
      .from("label_generation_jobs")
      .update({
        status: "failed",
        error: message,
        error_code: errorCode,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    await auditBulkPdfFailed(sb, {
      userId: input.userId,
      count,
      mode: "async",
      durationMs: Math.round(performance.now() - t0),
      errorCode,
      message,
      jobId,
    });
  }
}

export async function getBulkLabelJob(jobId: string) {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("label_generation_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function renderBulkLabelPdfSync(input: {
  entityIds: string[];
  preset: string;
  userId: string;
  origin: string;
}): Promise<{ bytes: Uint8Array; contentType: string; pipeline: string }> {
  const sb = await createSupabaseServerUserClient();
  const template = getLabelTemplate(input.preset);
  if (!template) throw new Error("Template non valido");

  const items = await buildBulkLabelItems(sb, input.entityIds, input.userId, input.origin);
  if (!items.length) throw new Error("Nessun ricambio valido");

  const t0 = performance.now();
  const count = items.length;
  await auditBulkPdfStarted(sb, { userId: input.userId, count, mode: "sync" });

  try {
    const result = await renderMultiLabelPdfWithPipeline(template, items);
    await auditBulkPdfCompleted(sb, {
      userId: input.userId,
      count,
      mode: "sync",
      durationMs: Math.round(performance.now() - t0),
      pdfBytes: result.bytes.byteLength,
      pipeline: result.pipeline,
    });
    const contentType = result.kind === "zip" ? "application/zip" : "application/pdf";
    return { bytes: result.bytes, contentType, pipeline: result.pipeline };
  } catch (e) {
    const errorCode = e instanceof LabelPdfTimeoutError ? e.code : "LABEL_PDF_FAILED";
    const message = e instanceof Error ? e.message : "Generazione fallita";
    await auditBulkPdfFailed(sb, {
      userId: input.userId,
      count,
      mode: "sync",
      durationMs: Math.round(performance.now() - t0),
      errorCode,
      message,
    });
    throw e;
  }
}
