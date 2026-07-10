import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { ImportExportRegistry } from "@/lib/data-import/registry/import-export-registry";
import { listImportBatchEntityIds } from "@/lib/data-import/core/import-batch-entities.server";
import type { ImportEntity } from "@/lib/data-import/core/types";

const TABLE_BY_ENTITY: Partial<Record<ImportEntity, string>> = {
  mezzi: "mezzi",
  magazzino_ricambi: "magazzino_ricambi",
};

export async function recoverImportBatch(batchId: string, userId: string): Promise<{ removed: number }> {
  const sb = await createSupabaseServerUserClient();
  const { data: batch, error } = await sb
    .from("import_batches")
    .select("*")
    .eq("id", batchId)
    .eq("created_by", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!batch) throw new Error("Batch non trovato.");
  if (batch.status === "running") {
    throw new Error("Recovery non disponibile mentre l'import è in corso.");
  }
  if (batch.status === "cancelled") {
    return { removed: 0 };
  }

  const entity = batch.entity as ImportEntity;
  const def = ImportExportRegistry.getDefinition(entity);
  const recovery = def.recoveryProvider;
  if (!recovery || recovery.capability === "NONE") {
    throw new Error("Recovery non supportata per questa entità.");
  }
  if (recovery.capability !== "CREATE_ONLY") {
    throw new Error("FULL recovery non ancora implementata.");
  }

  const entityIds = await listImportBatchEntityIds(batchId, entity);
  const fallbackIds = Array.isArray(batch.created_entity_ids)
    ? (batch.created_entity_ids as string[])
    : [];
  const ids = entityIds.length ? entityIds : fallbackIds;
  if (!ids.length) return { removed: 0 };

  const table = TABLE_BY_ENTITY[entity];
  if (!table) throw new Error("Recovery table mapping mancante.");

  let removed = 0;
  for (const id of ids) {
    const { count, error: delErr } = await sb
      .from(table)
      .delete({ count: "exact" })
      .eq("id", id);
    if (!delErr && (count ?? 0) > 0) removed += 1;
  }

  await sb
    .from("import_batches")
    .update({ status: "cancelled", stats: { ...(batch.stats as object), recovered: removed } })
    .eq("id", batchId);

  return { removed };
}
