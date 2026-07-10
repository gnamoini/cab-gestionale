import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { ImportEntity } from "@/lib/data-import/core/types";

export async function recordImportBatchEntities(
  batchId: string,
  entity: ImportEntity,
  entityIds: string[],
): Promise<void> {
  if (!entityIds.length) return;
  const sb = await createSupabaseServerUserClient();
  const rows = entityIds.map((entity_id) => ({
    batch_id: batchId,
    entity,
    entity_id,
  }));
  const { error } = await sb.from("import_batch_entities").insert(rows);
  if (error) throw new Error(error.message);
}

export async function listImportBatchEntityIds(batchId: string, entity: string): Promise<string[]> {
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("import_batch_entities")
    .select("entity_id")
    .eq("batch_id", batchId)
    .eq("entity", entity);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => String((r as { entity_id: string }).entity_id));
}
