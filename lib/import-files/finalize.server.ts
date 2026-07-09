import "server-only";

import { sha256Hex } from "@/lib/document-capture/sha256.server";
import { classifyStorageDownloadError } from "@/lib/storage/storage-download-errors";
import { IMPORT_SOURCES_MAX_BYTES } from "@/lib/import-files/import-file-mime.server";
import { isAllowedImportFileMime } from "@/lib/import-files/import-file-mime.server";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type FinalizeImportFileResult = {
  ok: true;
  id: string;
  sha256: string;
};

export type FinalizeImportFileStorageFailure = {
  ok: false;
  code: string;
  message: string;
  isPolicyError: boolean;
  storagePath: string;
  bucket: string;
};

export async function finalizeImportFileInTransaction(input: {
  fileId: string;
  storagePath: string;
}): Promise<FinalizeImportFileResult | FinalizeImportFileStorageFailure> {
  const bucket = STORAGE_BUCKETS.importSources;
  const sb = await createSupabaseServerUserClient();

  const { data: fileData, error: downloadError } = await sb.storage
    .from(bucket)
    .download(input.storagePath);

  if (downloadError || !fileData) {
    const classified = classifyStorageDownloadError(
      downloadError,
      Boolean(fileData),
      bucket,
      "finalizzazione",
    );
    return {
      ok: false,
      code: classified.code,
      message: classified.message,
      isPolicyError: classified.isPolicyError,
      storagePath: input.storagePath,
      bucket,
    };
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());
  if (bytes.byteLength > IMPORT_SOURCES_MAX_BYTES) {
    throw new Error("File troppo grande");
  }

  const mime = fileData.type || "application/octet-stream";
  if (!isAllowedImportFileMime(mime)) {
    throw new Error("Tipo file non consentito");
  }

  const sha256 = sha256Hex(bytes);

  const { data, error } = await sb.rpc("import_file_finalize", {
    p_file_id: input.fileId,
    p_sha256: sha256,
    p_mime: mime,
    p_file_size_bytes: bytes.byteLength,
  });

  if (error) {
    if (error.message.includes("invalid_status_transition")) {
      const err = new Error(error.message);
      (err as Error & { code?: string }).code = "invalid_status_transition";
      throw err;
    }
    throw new Error(error.message);
  }

  const result = data as { id?: string; sha256?: string };

  return {
    ok: true,
    id: result.id ?? input.fileId,
    sha256: result.sha256 ?? sha256,
  };
}
