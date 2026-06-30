import "server-only";

import type { ImportBatchStatus, ImportEntity } from "@/lib/data-import/core/types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type ImportBatchInsert = {
  entity: ImportEntity;
  file_name: string;
  file_sha256?: string | null;
  mapping?: Record<string, unknown>;
  rules?: Record<string, unknown>;
  created_by: string;
};

export async function createImportBatch(input: ImportBatchInsert): Promise<string> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("import_batches")
    .insert({
      entity: input.entity,
      file_name: input.file_name,
      file_sha256: input.file_sha256 ?? null,
      mapping: input.mapping ?? {},
      rules: input.rules ?? {},
      status: "pending",
      created_by: input.created_by,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return String(data.id);
}

export async function updateImportBatchProgress(
  batchId: string,
  patch: {
    status?: ImportBatchStatus;
    stats?: Record<string, unknown>;
    error_log?: unknown[];
    started_at?: string;
    finished_at?: string;
  },
): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const { error } = await sb.from("import_batches").update(patch).eq("id", batchId);
  if (error) throw new Error(error.message);
}

export async function listImportBatches(entity?: ImportEntity, limit = 50) {
  const sb = await createSupabaseServerUserClient();
  let q = sb.from("import_batches").select("*").order("created_at", { ascending: false }).limit(limit);
  if (entity) q = q.eq("entity", entity);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getImportBatch(batchId: string) {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb.from("import_batches").select("*").eq("id", batchId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
