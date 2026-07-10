import "server-only";

import { ImportFileService } from "@/lib/import-files/import-file-service.server";
import { buildListinoImportPreviewFromBytes } from "@/lib/magazzino/listino-import/listino-import-preview.server";
import type { ListinoImportPreviewResult } from "@/lib/magazzino/listino-import/listino-import-types";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function buildListinoImportPreviewFromImportFile(
  importFileId: string,
  userId: string,
): Promise<ListinoImportPreviewResult> {
  const bytesResult = await ImportFileService.getImportFileBytes(importFileId, userId);
  if (!bytesResult.ok) throw new Error(bytesResult.message);

  const sb = await createSupabaseServerUserClient();
  const { data: row, error } = await sb
    .from("import_files")
    .select("kind, file_name, mime, meta")
    .eq("id", importFileId)
    .maybeSingle();
  if (error || !row) throw new Error("File import non trovato");
  if (row.kind !== "listino") throw new Error("Il file import non è di tipo listino.");

  const meta =
    row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
      ? (row.meta as Record<string, unknown>)
      : {};
  const marcaDefault = typeof meta.marcaDefault === "string" ? meta.marcaDefault : "";

  return buildListinoImportPreviewFromBytes({
    bytes: bytesResult.bytes,
    fileName: bytesResult.fileName,
    contentType: bytesResult.mime,
    marcaDefault,
    documentoNome: bytesResult.fileName,
    importFileId,
    userId,
  });
}
