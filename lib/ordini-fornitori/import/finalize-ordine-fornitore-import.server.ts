import "server-only";

import { recordImportFileResult } from "@/lib/import-files/import-file-results.server";
import type { ImportSourceRef } from "@/lib/import-sources/types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function finalizeOrdineFornitoreImport(input: {
  source: ImportSourceRef;
  ordineId: string;
  contentHash: string;
  semanticKey?: string | null;
  userId: string;
}): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const contentHash = input.contentHash.trim();
  if (!contentHash) return;

  const importFileId = input.source.type === "import_file" ? input.source.id : null;
  const documentoId = input.source.type === "legacy_document" ? input.source.id : null;

  if (importFileId) {
    await recordImportFileResult({
      importFileId,
      entityType: "ordine_fornitore",
      entityId: input.ordineId,
    });
  }

  const { data: existing } = await sb
    .from("ordini_fornitori_import_log")
    .select("id")
    .eq("content_hash", contentHash)
    .maybeSingle();

  if (existing?.id) {
    await sb
      .from("ordini_fornitori_import_log")
      .update({
        ordine_id: input.ordineId,
        documento_id: documentoId,
        import_file_id: importFileId,
        semantic_key: input.semanticKey ?? null,
        created_by: input.userId,
      })
      .eq("id", existing.id);
  } else {
    await sb.from("ordini_fornitori_import_log").insert({
      ordine_id: input.ordineId,
      documento_id: documentoId,
      import_file_id: importFileId,
      content_hash: contentHash,
      semantic_key: input.semanticKey ?? null,
      created_by: input.userId,
    });
  }
}
