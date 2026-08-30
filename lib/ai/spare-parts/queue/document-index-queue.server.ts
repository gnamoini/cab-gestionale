import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { SPARE_PARTS_INDEX_MAX_ATTEMPTS } from "@/lib/ai/spare-parts/constants";

export type DocumentAiIndexRow = {
  id: string;
  documento_id: string;
  version: number;
  content_hash: string;
  status: string;
  understanding_status: string;
  is_active: boolean;
  attempt_count: number;
};

export async function enqueueDocumentAiIndex(
  sb: SupabaseClient,
  input: { documentoId: string; contentHash: string; forceReindex?: boolean },
): Promise<{ id: string; created: boolean; requeued?: boolean }> {
  const { data: existing } = await sb
    .from("document_ai_index")
    .select("id, status, understanding_status, content_hash, is_active")
    .eq("documento_id", input.documentoId)
    .eq("content_hash", input.contentHash)
    .maybeSingle();

  if (
    existing?.is_active &&
    existing.status === "indexed" &&
    (existing.understanding_status === "ready" || existing.understanding_status === "ready_with_warnings") &&
    !input.forceReindex
  ) {
    const { count } = await sb
      .from("document_ai_part_references")
      .select("id", { count: "exact", head: true })
      .eq("index_id", existing.id);
    if ((count ?? 0) > 0) {
      return { id: existing.id as string, created: false };
    }
    const now = new Date().toISOString();
    await sb
      .from("document_ai_index")
      .update({
        understanding_status: "pending",
        error_code: null,
        error_message: null,
        next_retry_at: null,
        updated_at: now,
      })
      .eq("id", existing.id);
    return { id: existing.id as string, created: false, requeued: true };
  }

  if (input.forceReindex && existing?.id && existing.is_active) {
    const now = new Date().toISOString();
    const { error } = await sb
      .from("document_ai_index")
      .update({
        status: "pending",
        understanding_status: "pending",
        attempt_count: 0,
        error_code: null,
        error_message: null,
        next_retry_at: null,
        index_quality: null,
        document_capabilities: {},
        extraction_reliability: null,
        metadata_json: {},
        updated_at: now,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { id: existing.id as string, created: false, requeued: true };
  }

  await sb
    .from("document_ai_index")
    .update({ is_active: false, status: "superseded", updated_at: new Date().toISOString() })
    .eq("documento_id", input.documentoId)
    .eq("is_active", true)
    .neq("content_hash", input.contentHash);

  const { data: maxVersion } = await sb
    .from("document_ai_index")
    .select("version")
    .eq("documento_id", input.documentoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (maxVersion?.version as number | undefined) ?? 0;

  const { data, error } = await sb
    .from("document_ai_index")
    .upsert(
      {
        documento_id: input.documentoId,
        content_hash: input.contentHash,
        version: nextVersion + 1,
        status: "pending",
        understanding_status: "pending",
        is_active: true,
        attempt_count: 0,
        error_code: null,
        error_message: null,
        next_retry_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "documento_id,content_hash" },
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id as string, created: true };
}

export async function claimDocumentIndexJobs(
  sb: SupabaseClient,
  limit: number,
): Promise<DocumentAiIndexRow[]> {
  const now = new Date().toISOString();
  const { data: pending } = await sb
    .from("document_ai_index")
    .select("id, documento_id, version, content_hash, status, understanding_status, is_active, attempt_count")
    .eq("is_active", true)
    .in("status", ["pending", "failed"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .lt("attempt_count", SPARE_PARTS_INDEX_MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(limit * 3);

  const claimed: DocumentAiIndexRow[] = [];
  for (const row of pending ?? []) {
    if (claimed.length >= limit) break;
    const { data: updated, error } = await sb
      .from("document_ai_index")
      .update({
        status: "processing",
        attempt_count: (row.attempt_count as number) + 1,
        updated_at: now,
      })
      .eq("id", row.id)
      .eq("status", row.status)
      .select("id, documento_id, version, content_hash, status, understanding_status, is_active, attempt_count")
      .maybeSingle();
    if (!error && updated) claimed.push(updated as DocumentAiIndexRow);
  }
  return claimed;
}

/** Claim esplicito per retry UI — ignora backoff `next_retry_at`. */
export async function claimDocumentIndexJobById(
  sb: SupabaseClient,
  indexId: string,
): Promise<DocumentAiIndexRow | null> {
  const { data: row } = await sb
    .from("document_ai_index")
    .select("id, documento_id, version, content_hash, status, understanding_status, is_active, attempt_count")
    .eq("id", indexId)
    .eq("is_active", true)
    .maybeSingle();
  if (!row) return null;
  if (row.status !== "pending" && row.status !== "failed") return null;
  if ((row.attempt_count as number) >= SPARE_PARTS_INDEX_MAX_ATTEMPTS) return null;

  const now = new Date().toISOString();
  const { data: updated, error } = await sb
    .from("document_ai_index")
    .update({
      status: "processing",
      attempt_count: (row.attempt_count as number) + 1,
      next_retry_at: null,
      error_code: null,
      error_message: null,
      updated_at: now,
    })
    .eq("id", indexId)
    .in("status", ["pending", "failed"])
    .select("id, documento_id, version, content_hash, status, understanding_status, is_active, attempt_count")
    .maybeSingle();
  if (error || !updated) return null;
  return updated as DocumentAiIndexRow;
}

export async function claimUnderstandingJobById(
  sb: SupabaseClient,
  indexId: string,
): Promise<DocumentAiIndexRow | null> {
  const { data: row } = await sb
    .from("document_ai_index")
    .select("id, documento_id, version, content_hash, status, understanding_status, is_active, attempt_count")
    .eq("id", indexId)
    .eq("is_active", true)
    .maybeSingle();
  if (!row || row.status !== "indexed") return null;
  if (row.understanding_status !== "pending" && row.understanding_status !== "failed") return null;

  const now = new Date().toISOString();
  const { data: updated, error } = await sb
    .from("document_ai_index")
    .update({
      understanding_status: "processing",
      error_code: null,
      error_message: null,
      updated_at: now,
    })
    .eq("id", indexId)
    .in("understanding_status", ["pending", "failed"])
    .select("id, documento_id, version, content_hash, status, understanding_status, is_active, attempt_count")
    .maybeSingle();
  if (error || !updated) return null;
  return updated as DocumentAiIndexRow;
}

export async function claimUnderstandingJobs(
  sb: SupabaseClient,
  limit: number,
): Promise<DocumentAiIndexRow[]> {
  const now = new Date().toISOString();
  const { data: rows } = await sb
    .from("document_ai_index")
    .select("id, documento_id, version, content_hash, status, understanding_status, is_active, attempt_count")
    .eq("is_active", true)
    .eq("status", "indexed")
    .in("understanding_status", ["pending", "failed"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(limit * 3);

  const claimed: DocumentAiIndexRow[] = [];
  for (const row of rows ?? []) {
    if (claimed.length >= limit) break;
    const { data: updated, error } = await sb
      .from("document_ai_index")
      .update({ understanding_status: "processing", updated_at: now, error_code: null, error_message: null })
      .eq("id", row.id)
      .in("understanding_status", ["pending", "failed"])
      .select("id, documento_id, version, content_hash, status, understanding_status, is_active, attempt_count")
      .maybeSingle();
    if (!error && updated) claimed.push(updated as DocumentAiIndexRow);
  }
  return claimed;
}

export async function markIndexFailed(
  sb: SupabaseClient,
  indexId: string,
  errorCode: string,
  errorMessage: string,
  attemptCount: number,
): Promise<void> {
  const backoffMinutes = Math.min(60, 2 ** Math.min(attemptCount, 5));
  const nextRetry = new Date(Date.now() + backoffMinutes * 60_000).toISOString();
  await sb
    .from("document_ai_index")
    .update({
      status: "failed",
      error_code: errorCode,
      error_message: errorMessage.slice(0, 500),
      next_retry_at: nextRetry,
      updated_at: new Date().toISOString(),
    })
    .eq("id", indexId);
}
