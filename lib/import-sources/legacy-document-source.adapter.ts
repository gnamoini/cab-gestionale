import "server-only";

import { getCachedDocumentoBytesResult } from "@/lib/documents/document-delivery-storage.server";
import { fetchArchiveDocumentFileServer } from "@/lib/documents/document-fetch-server";
import { readDocumentIntelligenceMeta } from "@/lib/documents/document-meta";
import { classifyStorageDownloadError } from "@/lib/storage/storage-download-errors";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { DocumentoRow } from "@/src/types/supabase-tables";

export type LegacyDocumentImportSource = {
  bytes: Uint8Array;
  mime: string;
  fileName: string;
  contentHash: string;
  storagePath: string;
  bucket: string;
};

export async function resolveLegacyDocumentImportSource(
  documentoId: string,
): Promise<LegacyDocumentImportSource> {
  const resolved = await fetchArchiveDocumentFileServer(documentoId);
  if (!resolved.success || !resolved.data) {
    throw new Error(resolved.error ?? "Documento non trovato.");
  }

  const sb = await createSupabaseServerUserClient();
  const { data: docRow, error: docErr } = await sb.from("documenti").select("*").eq("id", documentoId).maybeSingle();
  if (docErr) throw new Error(docErr.message);
  if (!docRow) throw new Error("Documento non trovato.");
  const documento = docRow as DocumentoRow;

  const file = resolved.data;
  const bucket = STORAGE_BUCKETS.documenti;
  const download = await getCachedDocumentoBytesResult(file.storagePath);
  if (!download.ok) {
    const classified = classifyStorageDownloadError(
      download.downloadError,
      false,
      bucket,
      "import ordine",
    );
    throw new Error(classified.message);
  }

  const intelligence = readDocumentIntelligenceMeta((documento.meta ?? {}) as Record<string, unknown>);
  const contentHash = intelligence.contentHash ?? file.contentHash ?? "";

  return {
    bytes: download.bytes,
    mime: file.contentType || "application/pdf",
    fileName: file.fileName,
    contentHash,
    storagePath: file.storagePath,
    bucket,
  };
}
