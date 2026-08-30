import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageDownloadErrorCode } from "@/lib/storage/storage-download-errors";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type DocumentoBytesDownloadResult =
  | { ok: true; bytes: Uint8Array }
  | {
      ok: false;
      code: StorageDownloadErrorCode;
      message: string;
      isPolicyError: boolean;
      downloadError: unknown;
    };

export async function downloadDocumentoBytesResult(
  objectPath: string,
): Promise<DocumentoBytesDownloadResult> {
  const sb = await createSupabaseServerUserClient();
  const normalized = normalizeStorageObjectPath(objectPath);
  const { data, error } = await sb.storage.from(STORAGE_BUCKETS.documenti).download(normalized);

  if (error || !data) {
    return {
      ok: false,
      code: error ? "STORAGE_PERMISSION_DENIED" : "STORAGE_EMPTY",
      message: error instanceof Error ? error.message : "Download non riuscito.",
      isPolicyError: false,
      downloadError: error,
    };
  }

  return { ok: true, bytes: new Uint8Array(await data.arrayBuffer()) };
}

export async function downloadDocumentoBytes(objectPath: string): Promise<Uint8Array | null> {
  const result = await downloadDocumentoBytesResult(objectPath);
  return result.ok ? result.bytes : null;
}

/** Download con client Supabase esplicito (es. service role nel worker indicizzazione). */
export async function downloadDocumentoBytesWithClient(
  sb: SupabaseClient,
  objectPath: string,
): Promise<Uint8Array | null> {
  const normalized = normalizeStorageObjectPath(objectPath);
  const { data, error } = await sb.storage.from(STORAGE_BUCKETS.documenti).download(normalized);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export const getCachedDocumentoBytes = cache(async (objectPath: string) => {
  return downloadDocumentoBytes(objectPath);
});

export const getCachedDocumentoBytesResult = cache(async (objectPath: string) => {
  return downloadDocumentoBytesResult(objectPath);
});
