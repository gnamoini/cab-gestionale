import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";

export type PurgeLabelArtifactsResult = {
  dbDeleted: number;
  storageAttempted: number;
  storageFailed: string[];
};

/** IL-016: DB delete required; storage delete best-effort (does not throw on storage failure). */
export async function purgeLabelArtifactsForEntity(
  sb: SupabaseClient,
  entityType: string,
  entityId: string,
): Promise<PurgeLabelArtifactsResult> {
  const { data: rows, error: selectErr } = await sb
    .from("inventory_label_artifacts")
    .select("id, storage_path")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (selectErr) throw new Error(selectErr.message);

  const paths = (rows ?? []).map((r) => String(r.storage_path)).filter(Boolean);
  const { error: deleteErr, count } = await sb
    .from("inventory_label_artifacts")
    .delete({ count: "exact" })
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (deleteErr) throw new Error(deleteErr.message);

  const storageFailed: string[] = [];
  for (const rawPath of paths) {
    const path = normalizeStorageObjectPath(rawPath);
    const { error } = await sb.storage.from(STORAGE_BUCKETS.pdfArtifacts).remove([path]);
    if (error) {
      storageFailed.push(path);
      console.warn("[inventory-label] artifact storage purge failed", {
        entityType,
        entityId,
        path,
        message: error.message,
      });
    }
  }

  if (storageFailed.length) {
    console.warn("[inventory-label] artifact purge storage failures", {
      entityType,
      entityId,
      failedCount: storageFailed.length,
      paths: storageFailed,
    });
  }

  return {
    dbDeleted: count ?? rows?.length ?? 0,
    storageAttempted: paths.length,
    storageFailed,
  };
}

/** ponytail: future cron — scan storage vs DB; not implemented in Fase 1 */
export function listOrphanArtifactPathsHint(): string {
  return "inventory-labels/";
}
