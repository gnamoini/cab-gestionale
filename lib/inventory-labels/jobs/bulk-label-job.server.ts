import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { buildInventoryQrUrl } from "@/lib/inventory-labels/domain/tokens";
import { ensureActiveInventoryToken } from "@/lib/inventory-labels/domain/tokens.server";
import { labelPayloadFromMagazzinoRow, magazzinoRicambioEntityType } from "@/lib/inventory-labels/domain/ricambio-payload.server";
import { renderMultiLabelPdf } from "@/lib/inventory-labels/render/pdf";
import { uploadLabelArtifact } from "@/lib/inventory-labels/storage/artifacts.server";
import { MAGAZZINO_RICAMBI_COLUMNS } from "@/lib/db/table-select-columns";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import { createHash } from "node:crypto";

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
      entity_ids: input.entityIds,
      preset: input.preset,
      format: "pdf",
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const jobId = String(data.id);
  void processBulkLabelJob(jobId, input);
  return jobId;
}

async function processBulkLabelJob(
  jobId: string,
  input: { entityIds: string[]; preset: string; userId: string; origin: string },
): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  try {
    await sb.from("label_generation_jobs").update({ status: "running" }).eq("id", jobId);

    const template = getLabelTemplate(input.preset);
    if (!template) throw new Error("Template non valido");

    const { data: rows, error: fetchErr } = await sb
      .from("magazzino_ricambi")
      .select(MAGAZZINO_RICAMBI_COLUMNS)
      .in("id", input.entityIds);
    if (fetchErr) throw new Error(fetchErr.message);

    const byId = new Map((rows as MagazzinoRicambioRow[]).map((r) => [r.id, r]));
    const items: Array<{ payload: ReturnType<typeof labelPayloadFromMagazzinoRow>; qrUrl: string }> = [];

    for (const id of input.entityIds) {
      const row = byId.get(id);
      if (!row) continue;
      const entityType = magazzinoRicambioEntityType();
      const tokenRow = await ensureActiveInventoryToken(sb, entityType, id, input.userId);
      items.push({
        payload: labelPayloadFromMagazzinoRow(row),
        qrUrl: buildInventoryQrUrl(tokenRow.token, input.origin),
      });
    }

    if (!items.length) throw new Error("Nessun ricambio valido per la stampa");

    const pdfBytes = await renderMultiLabelPdf(template, items);
    const hash = createHash("sha256").update(input.entityIds.join(",")).digest("hex").slice(0, 16);
    const path = await uploadLabelArtifact({
      entityType: "bulk",
      entityId: jobId,
      hash,
      format: "pdf",
      bytes: pdfBytes,
    });

    await sb
      .from("label_generation_jobs")
      .update({
        status: "completed",
        result_storage_path: path,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (e) {
    await sb
      .from("label_generation_jobs")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message : "Generazione fallita",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
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
}): Promise<Uint8Array> {
  const sb = await createSupabaseServerUserClient();
  const template = getLabelTemplate(input.preset);
  if (!template) throw new Error("Template non valido");

  const { data: rows, error } = await sb
    .from("magazzino_ricambi")
    .select(MAGAZZINO_RICAMBI_COLUMNS)
    .in("id", input.entityIds);
  if (error) throw new Error(error.message);

  const byId = new Map((rows as MagazzinoRicambioRow[]).map((r) => [r.id, r]));
  const items: Array<{ payload: ReturnType<typeof labelPayloadFromMagazzinoRow>; qrUrl: string }> = [];

  for (const id of input.entityIds) {
    const row = byId.get(id);
    if (!row) continue;
    const entityType = magazzinoRicambioEntityType();
    const tokenRow = await ensureActiveInventoryToken(sb, entityType, id, input.userId);
    items.push({
      payload: labelPayloadFromMagazzinoRow(row),
      qrUrl: buildInventoryQrUrl(tokenRow.token, input.origin),
    });
  }

  if (!items.length) throw new Error("Nessun ricambio valido");
  return renderMultiLabelPdf(template, items);
}
