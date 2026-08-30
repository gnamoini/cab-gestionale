import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { SPARE_PARTS_INDEX_MAX_ATTEMPTS, DOCUMENT_INDEX_PROCESSING_STALE_MS } from "@/lib/ai/spare-parts/constants";
import { markIndexFailed } from "@/lib/ai/spare-parts/queue/document-index-queue.server";

export async function reclaimStuckDocumentIndexJobs(
  sb: SupabaseClient,
  input?: { thresholdMs?: number },
): Promise<number> {
  const cutoff = new Date(Date.now() - (input?.thresholdMs ?? DOCUMENT_INDEX_PROCESSING_STALE_MS)).toISOString();
  const now = new Date().toISOString();
  let reclaimed = 0;

  const { data: gatedPending, error: gatedErr } = await sb
    .from("document_ai_index")
    .select("id")
    .eq("is_active", true)
    .eq("status", "pending")
    .not("next_retry_at", "is", null);

  if (gatedErr) throw new Error(gatedErr.message);

  for (const row of gatedPending ?? []) {
    const { error: updErr } = await sb
      .from("document_ai_index")
      .update({ next_retry_at: null, updated_at: now })
      .eq("id", row.id)
      .eq("status", "pending");
    if (!updErr) reclaimed += 1;
  }

  const { data: indexStuck, error: indexErr } = await sb
    .from("document_ai_index")
    .select("id, attempt_count")
    .eq("is_active", true)
    .eq("status", "processing")
    .lt("updated_at", cutoff);

  if (indexErr) throw new Error(indexErr.message);

  for (const row of indexStuck ?? []) {
    const attemptCount = Number(row.attempt_count ?? 0);
    if (attemptCount >= SPARE_PARTS_INDEX_MAX_ATTEMPTS) {
      await markIndexFailed(sb, row.id as string, "WORKER_STALE", "Worker non ha completato entro il timeout", attemptCount);
    } else {
      const { error: updErr } = await sb
        .from("document_ai_index")
        .update({ status: "pending", updated_at: now })
        .eq("id", row.id)
        .eq("status", "processing");
      if (!updErr) reclaimed += 1;
    }
  }

  const { data: understandingStuck, error: understandingErr } = await sb
    .from("document_ai_index")
    .select("id")
    .eq("is_active", true)
    .eq("status", "indexed")
    .eq("understanding_status", "processing")
    .lt("updated_at", cutoff);

  if (understandingErr) throw new Error(understandingErr.message);

  for (const row of understandingStuck ?? []) {
    const { error: updErr } = await sb
      .from("document_ai_index")
      .update({ understanding_status: "pending", updated_at: now })
      .eq("id", row.id)
      .eq("understanding_status", "processing");
    if (!updErr) reclaimed += 1;
  }

  return reclaimed;
}
