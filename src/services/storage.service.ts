"use client";

import { ensureStorageBucketsAction } from "@/src/actions/ensure-storage-buckets";
import { STORAGE_BUCKETS, type StorageBucketId } from "@/src/lib/storage/storage-config";
import { isBucketNotFoundError, mapStorageError } from "@/src/lib/storage/storage-errors";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

export { STORAGE_BUCKETS };
export type { StorageBucketId };

const bucketReadyCache = new Map<StorageBucketId, boolean>();
const bucketProvisionAttempted = new Set<StorageBucketId>();

function markBucketReady(bucket: StorageBucketId): void {
  bucketReadyCache.set(bucket, true);
}

function storageError(error: unknown, bucket: StorageBucketId): Error {
  return new Error(mapStorageError(error, bucket));
}

async function verifyBucketExists(bucket: StorageBucketId): Promise<boolean> {
  if (bucketReadyCache.get(bucket)) return true;

  const supabase = getBrowserSupabase();
  const { error } = await supabase.storage.from(bucket).list("", { limit: 1 });

  if (!error) {
    markBucketReady(bucket);
    return true;
  }

  if (isBucketNotFoundError(error)) return false;

  // Bucket esiste ma list può fallire per RLS/vuoto — non trattare come assente.
  markBucketReady(bucket);
  return true;
}

async function tryProvisionBucket(bucket: StorageBucketId): Promise<boolean> {
  if (bucketProvisionAttempted.has(bucket)) return false;
  bucketProvisionAttempted.add(bucket);

  const result = await ensureStorageBucketsAction([bucket]);
  if (!result.ok) {
    console.warn(`[storage] provisioning bucket "${bucket}" non riuscito:`, result.message);
    return false;
  }

  return verifyBucketExists(bucket);
}

/** Verifica (e opzionalmente provisiona) un bucket prima di upload/list/delete. */
export async function ensureStorageBucketReady(bucket: StorageBucketId): Promise<void> {
  if (await verifyBucketExists(bucket)) return;

  const provisioned = await tryProvisionBucket(bucket);
  if (provisioned) return;

  throw storageError({ message: "Bucket not found" }, bucket);
}

export async function storageUpload(
  bucket: StorageBucketId,
  path: string,
  body: File | Blob | ArrayBuffer,
  options?: { contentType?: string; upsert?: boolean; cacheControl?: string },
): Promise<void> {
  await ensureStorageBucketReady(bucket);
  const objectPath = normalizeStorageObjectPath(path);
  const supabase = getBrowserSupabase();
  const { error } = await supabase.storage.from(bucket).upload(objectPath, body, {
    contentType: options?.contentType,
    upsert: options?.upsert ?? false,
    cacheControl: options?.cacheControl,
  });
  if (error) throw storageError(error, bucket);
}

export async function storageRemove(bucket: StorageBucketId, paths: string[]): Promise<void> {
  await ensureStorageBucketReady(bucket);
  const normalized = paths.map((p) => normalizeStorageObjectPath(p)).filter(Boolean);
  if (normalized.length === 0) return;
  const supabase = getBrowserSupabase();
  const { error } = await supabase.storage.from(bucket).remove(normalized);
  if (error) throw storageError(error, bucket);
}

export type StorageListedObject = {
  name: string;
  id: string | null;
  created_at: string | null;
};

export async function storageList(
  bucket: StorageBucketId,
  prefix: string,
  options?: { limit?: number; sortBy?: { column: string; order: "asc" | "desc" } },
): Promise<StorageListedObject[]> {
  await ensureStorageBucketReady(bucket);
  const folder = normalizeStorageObjectPath(prefix);
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: options?.limit ?? 100,
    sortBy: options?.sortBy,
  });
  if (error) throw storageError(error, bucket);
  return (data ?? []).filter((item) => item.name && item.name !== ".emptyFolderPlaceholder");
}

export async function storageCreateSignedUrl(
  bucket: StorageBucketId,
  path: string,
  expiresInSeconds: number,
): Promise<string> {
  await ensureStorageBucketReady(bucket);
  const objectPath = normalizeStorageObjectPath(path);
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, expiresInSeconds);
  if (error || !data?.signedUrl) throw storageError(error ?? { message: "Signed URL non disponibile" }, bucket);
  return data.signedUrl;
}

/** Precheck leggero all'avvio (es. prima lista immagini). Non blocca l'app se fallisce. */
export async function prefetchStorageBuckets(buckets: StorageBucketId[] = Object.values(STORAGE_BUCKETS)): Promise<void> {
  await Promise.all(
    buckets.map(async (bucket) => {
      try {
        await ensureStorageBucketReady(bucket);
      } catch (e) {
        console.warn(`[storage] bucket "${bucket}" non pronto:`, e instanceof Error ? e.message : e);
      }
    }),
  );
}
