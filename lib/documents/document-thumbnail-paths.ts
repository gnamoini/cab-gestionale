import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";

const SHA256_HEX_LEN = 64;

export function normalizeContentHash(contentHash: string): string {
  return contentHash.trim().toLowerCase().replace(/[^a-f0-9]/g, "").slice(0, SHA256_HEX_LEN);
}

/** Object path in bucket `documenti-thumbnails` (content-addressed). */
export function buildDocumentThumbnailObjectPath(contentHash: string): string {
  const hash = normalizeContentHash(contentHash);
  if (hash.length !== SHA256_HEX_LEN) {
    throw new Error("Hash contenuto non valido per thumbnail.");
  }
  return normalizeStorageObjectPath(`${hash}.webp`);
}
