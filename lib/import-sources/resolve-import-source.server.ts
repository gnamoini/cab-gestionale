import "server-only";

import { getImportFileBytes } from "@/lib/import-files/import-file-bytes.server";
import { resolveLegacyDocumentImportSource } from "@/lib/import-sources/legacy-document-source.adapter";
import type { ImportSourceRef, ResolvedImportSource } from "@/lib/import-sources/types";

export async function resolveImportSource(
  ref: ImportSourceRef,
  userId: string,
): Promise<ResolvedImportSource> {
  if (ref.type === "import_file") {
    const download = await getImportFileBytes(ref.id, userId);
    if (!download.ok) {
      throw new Error(download.message);
    }
    return {
      kind: "import_file",
      importFileId: ref.id,
      bytes: download.bytes,
      mime: download.mime,
      fileName: download.fileName,
      contentHash: download.sha256 ?? "",
      storagePath: download.storagePath,
      bucket: download.bucket,
    };
  }

  const legacy = await resolveLegacyDocumentImportSource(ref.id);
  return {
    kind: "legacy_document",
    documentoId: ref.id,
    bytes: legacy.bytes,
    mime: legacy.mime,
    fileName: legacy.fileName,
    contentHash: legacy.contentHash,
    storagePath: legacy.storagePath,
    bucket: legacy.bucket,
  };
}

export function resolvedImportFileId(resolved: ResolvedImportSource): string | null {
  return resolved.kind === "import_file" ? resolved.importFileId : null;
}
