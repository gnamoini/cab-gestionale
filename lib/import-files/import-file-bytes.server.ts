import "server-only";

import { cache } from "react";
import { assertImportFileProcessAccess } from "@/lib/import-files/import-file-access.server";
import { classifyStorageDownloadError } from "@/lib/storage/storage-download-errors";
import type { StorageDownloadErrorCode } from "@/lib/storage/storage-download-errors";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type ImportFileBytesResult =
  | {
      ok: true;
      bytes: Uint8Array;
      mime: string;
      fileName: string;
      sha256: string | null;
      storagePath: string;
      bucket: string;
    }
  | {
      ok: false;
      code: StorageDownloadErrorCode;
      message: string;
      isPolicyError: boolean;
      storagePath: string;
      bucket: string;
    };

async function getImportFileBytesUncached(
  fileId: string,
  userId: string,
): Promise<ImportFileBytesResult> {
  await assertImportFileProcessAccess(fileId, userId);

  const sb = await createSupabaseServerUserClient();
  const { data: row, error: rowError } = await sb
    .from("import_files")
    .select("storage_path, file_name, mime, sha256, status")
    .eq("id", fileId)
    .maybeSingle();

  if (rowError || !row?.storage_path) {
    return {
      ok: false,
      code: "STORAGE_NOT_FOUND",
      message: rowError?.message ?? "File import non trovato o scaduto.",
      isPolicyError: false,
      storagePath: "",
      bucket: STORAGE_BUCKETS.importSources,
    };
  }

  const bucket = STORAGE_BUCKETS.importSources;
  const storagePath = row.storage_path;

  const { data: fileData, error: downloadError } = await sb.storage.from(bucket).download(storagePath);

  if (downloadError || !fileData) {
    const classified = classifyStorageDownloadError(
      downloadError,
      Boolean(fileData),
      bucket,
      "import ordine",
    );
    return {
      ok: false,
      code: classified.code,
      message: classified.message,
      isPolicyError: classified.isPolicyError,
      storagePath,
      bucket,
    };
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());
  if (bytes.byteLength === 0) {
    return {
      ok: false,
      code: "STORAGE_EMPTY",
      message: "File import vuoto.",
      isPolicyError: false,
      storagePath,
      bucket,
    };
  }

  return {
    ok: true,
    bytes,
    mime: fileData.type || row.mime || "application/octet-stream",
    fileName: row.file_name,
    sha256: row.sha256,
    storagePath,
    bucket,
  };
}

export const getImportFileBytesResult = cache(getImportFileBytesUncached);

export async function getImportFileBytes(fileId: string, userId: string): Promise<ImportFileBytesResult> {
  return getImportFileBytesResult(fileId, userId);
}
