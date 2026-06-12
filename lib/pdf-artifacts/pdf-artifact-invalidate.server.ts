import "server-only";

import { buildPdfArtifactScopePrefix } from "@/lib/pdf-artifacts/pdf-artifact-paths";
import type { PdfArtifactType } from "@/lib/pdf-artifacts/pdf-artifact-registry";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

/** Elimina tutti gli artifact sotto `type/scopeId/` (invalidazione esplicita). */
export async function invalidatePdfArtifactScope(type: PdfArtifactType, scopeId: string): Promise<number> {
  const sb = await createSupabaseServerUserClient();
  const prefix = buildPdfArtifactScopePrefix(type, scopeId);
  const { data, error } = await sb.storage.from(STORAGE_BUCKETS.pdfArtifacts).list(prefix, { limit: 200 });
  if (error || !data?.length) return 0;
  const paths = data.filter((f) => f.name).map((f) => `${prefix}/${f.name}`);
  if (paths.length === 0) return 0;
  const { error: removeErr } = await sb.storage.from(STORAGE_BUCKETS.pdfArtifacts).remove(paths);
  if (removeErr) throw new Error(removeErr.message);
  return paths.length;
}
