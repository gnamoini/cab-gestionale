"use client";

import {
  IMAGE_STORAGE_SCOPES,
  STORAGE_LIMITS,
  type ImageStorageScope,
} from "@/src/lib/storage/storage-config";
import {
  buildImageStoragePath,
  imageStoragePrefix,
  normalizeStorageObjectPath,
  sanitizeStorageFileName,
} from "@/src/lib/storage/storage-paths";
import {
  STORAGE_BUCKETS,
  storageCreateSignedUrl,
  storageList,
  storageRemove,
  storageUpload,
} from "@/src/services/storage.service";

export type ImageScope = ImageStorageScope;

export type StoredImage = {
  name: string;
  path: string;
  signedUrl: string;
  createdAt: string | null;
};

export const MAX_IMAGES_PER_RECORD = STORAGE_LIMITS.imagesMaxPerRecord;
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.82;

export { IMAGE_STORAGE_SCOPES };

export function imagePrefix(scope: ImageScope, recordId: string): string {
  return imageStoragePrefix(scope, recordId);
}

async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Seleziona un file immagine.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", JPEG_QUALITY);
  });
}

export async function listStoredImages(scope: ImageScope, recordId: string): Promise<StoredImage[]> {
  const prefix = imageStoragePrefix(scope, recordId);
  const files = await storageList(STORAGE_BUCKETS.images, prefix, {
    limit: 20,
    sortBy: { column: "created_at", order: "desc" },
  });

  const signed = await Promise.all(
    files.map(async (item) => {
      const path = normalizeStorageObjectPath(`${prefix}/${item.name}`);
      const signedUrl = await storageCreateSignedUrl(STORAGE_BUCKETS.images, path, 60 * 60);
      return {
        name: item.name,
        path,
        signedUrl,
        createdAt: item.created_at ?? null,
      };
    }),
  );
  return signed;
}

export async function uploadStoredImage(scope: ImageScope, recordId: string, file: File): Promise<{ name: string; path: string }> {
  const existing = await listStoredImages(scope, recordId);
  if (existing.length >= MAX_IMAGES_PER_RECORD) {
    throw new Error(`Limite massimo ${MAX_IMAGES_PER_RECORD} immagini raggiunto`);
  }
  const body = await compressImage(file);
  const name = `${Date.now()}-${sanitizeStorageFileName(file.name, "image").replace(/\.[^.]+$/, "")}.jpg`;
  const path = buildImageStoragePath(scope, recordId, name);
  await storageUpload(STORAGE_BUCKETS.images, path, body, {
    contentType: "image/jpeg",
    upsert: false,
  });
  return { name, path };
}

export async function deleteStoredImage(path: string): Promise<void> {
  await storageRemove(STORAGE_BUCKETS.images, [path]);
}
