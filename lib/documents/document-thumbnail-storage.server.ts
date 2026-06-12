import "server-only";

import { cache } from "react";
import { buildDocumentThumbnailObjectPath } from "@/lib/documents/document-thumbnail-paths";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export async function downloadDocumentThumbnail(contentHash: string): Promise<Uint8Array | null> {
  const sb = await createSupabaseServerUserClient();
  const objectPath = buildDocumentThumbnailObjectPath(contentHash);
  const { data, error } = await sb.storage.from(STORAGE_BUCKETS.documentiThumbnails).download(objectPath);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export const getCachedDocumentThumbnail = cache(async (contentHash: string) => {
  return downloadDocumentThumbnail(contentHash);
});

export async function uploadDocumentThumbnail(contentHash: string, bytes: Uint8Array): Promise<string> {
  const sb = await createSupabaseServerUserClient();
  const objectPath = buildDocumentThumbnailObjectPath(contentHash);
  const { error } = await sb.storage.from(STORAGE_BUCKETS.documentiThumbnails).upload(objectPath, bytes, {
    contentType: "image/webp",
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw new Error(error.message);
  return normalizeStorageObjectPath(objectPath);
}

export async function removeDocumentThumbnail(contentHash: string): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const objectPath = buildDocumentThumbnailObjectPath(contentHash);
  await sb.storage.from(STORAGE_BUCKETS.documentiThumbnails).remove([objectPath]);
}
