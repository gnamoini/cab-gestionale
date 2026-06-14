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
import { encodeImageVariantsFromFile } from "@/lib/media/image-encode";
import {
  allVariantPathsForLogicalBase,
  buildImageVariantBaseName,
  imageVariantFileName,
  imageVariantPathsForBase,
  isLegacyJpegImageName,
  isModernImageVariantName,
  logicalImageBaseFromFileName,
} from "@/lib/media/image-variants";
import { buildMediaDeliveryUrl } from "@/lib/media/media-delivery-url";
import {
  resolveStoredImageVariantPaths,
  type StoredImageVariantPaths,
} from "@/lib/media/image-storage-delivery";
import {
  STORAGE_BUCKETS,
  storageList,
  storageRemove,
  storageUpload,
} from "@/src/services/storage.service";

export type ImageScope = ImageStorageScope;

export type { StoredImageVariantPaths } from "@/lib/media/image-storage-delivery";
export { resolveStoredImageVariantPaths } from "@/lib/media/image-storage-delivery";

export type StoredImage = StoredImageVariantPaths & {
  name: string;
  baseName: string;
  /** Path canonico per log (thumb o legacy). */
  path: string;
  createdAt: string | null;
  /** URL delivery thumb — proxy stabile (non signed). */
  signedUrl: string;
};

export const MAX_IMAGES_PER_RECORD = STORAGE_LIMITS.imagesMaxPerRecord;

export { IMAGE_STORAGE_SCOPES };

export function imagePrefix(scope: ImageScope, recordId: string): string {
  return imageStoragePrefix(scope, recordId);
}

function deliveryThumbUrl(thumbPath: string): string {
  return buildMediaDeliveryUrl(thumbPath, { w: 128, f: "webp" });
}

type GroupedFiles = {
  baseName: string;
  thumb?: string;
  fullAvif?: string;
  fullWebp?: string;
  legacy?: string;
  createdAt: string | null;
};

function groupListedFiles(prefix: string, files: { name: string; created_at?: string | null }[]): GroupedFiles[] {
  const map = new Map<string, GroupedFiles>();

  for (const item of files) {
    const baseName = logicalImageBaseFromFileName(item.name);
    if (!baseName) continue;
    if (isModernImageVariantName(item.name) === false && !isLegacyJpegImageName(item.name)) continue;

    const key = baseName;
    const entry = map.get(key) ?? { baseName, createdAt: item.created_at ?? null };
    const fullPath = normalizeStorageObjectPath(`${prefix}/${item.name}`);

    if (item.name.includes(".thumb.webp")) entry.thumb = fullPath;
    else if (item.name.includes(".full.avif")) entry.fullAvif = fullPath;
    else if (item.name.includes(".full.webp")) entry.fullWebp = fullPath;
    else if (isLegacyJpegImageName(item.name)) entry.legacy = fullPath;

    if (!entry.createdAt && item.created_at) entry.createdAt = item.created_at;
    map.set(key, entry);
  }

  return [...map.values()].filter((g) => g.thumb || g.legacy);
}

function storedImageFromGroup(group: GroupedFiles): StoredImage {
  const paths = resolveStoredImageVariantPaths(group);

  return {
    name: group.baseName,
    baseName: group.baseName,
    path: paths.thumbPath,
    ...paths,
    createdAt: group.createdAt,
    signedUrl: deliveryThumbUrl(paths.thumbPath),
  };
}

export async function listStoredImages(scope: ImageScope, recordId: string): Promise<StoredImage[]> {
  const prefix = imageStoragePrefix(scope, recordId);
  const files = await storageList(STORAGE_BUCKETS.images, prefix, {
    limit: 60,
    sortBy: { column: "created_at", order: "desc" },
  });

  const groups = groupListedFiles(prefix, files);
  return groups
    .map(storedImageFromGroup)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function uploadStoredImage(
  scope: ImageScope,
  recordId: string,
  file: File,
): Promise<{ name: string; path: string; baseName: string }> {
  const existing = await listStoredImages(scope, recordId);
  if (existing.length >= MAX_IMAGES_PER_RECORD) {
    throw new Error(`Limite massimo ${MAX_IMAGES_PER_RECORD} immagini raggiunto`);
  }

  const encoded = await encodeImageVariantsFromFile(file);
  const timestamp = Date.now();
  const stem = sanitizeStorageFileName(file.name, "image").replace(/\.[^.]+$/, "");
  const baseName = buildImageVariantBaseName(timestamp, stem);
  const prefix = imageStoragePrefix(scope, recordId);
  const paths = imageVariantPathsForBase(prefix, baseName);

  await storageUpload(STORAGE_BUCKETS.images, paths.thumb, encoded.thumb.blob, {
    contentType: encoded.thumb.contentType,
    upsert: false,
  });
  await storageUpload(STORAGE_BUCKETS.images, paths.fullWebp, encoded.fullWebp.blob, {
    contentType: encoded.fullWebp.contentType,
    upsert: false,
  });
  if (encoded.fullAvif) {
    await storageUpload(STORAGE_BUCKETS.images, paths.fullAvif, encoded.fullAvif.blob, {
      contentType: encoded.fullAvif.contentType,
      upsert: false,
    });
  }

  return { name: baseName, path: paths.thumb, baseName };
}

export async function deleteStoredImage(imageOrPath: StoredImage | string): Promise<void> {
  if (typeof imageOrPath === "string") {
    await storageRemove(STORAGE_BUCKETS.images, [normalizeStorageObjectPath(imageOrPath)]);
    return;
  }

  const paths =
    imageOrPath.allPaths.length > 0
      ? imageOrPath.allPaths
      : allVariantPathsForLogicalBase(
          imageOrPath.path.split("/").slice(0, -1).join("/"),
          imageOrPath.baseName,
        );

  await storageRemove(STORAGE_BUCKETS.images, paths.map(normalizeStorageObjectPath));
}

/** @deprecated legacy single-file upload name helper */
export function legacyImageFileName(timestamp: number, stem: string): string {
  return imageVariantFileName(buildImageVariantBaseName(timestamp, stem), "thumb").replace(
    ".thumb.webp",
    ".jpg",
  );
}

/** @deprecated use buildImageStoragePath for tests */
export { buildImageStoragePath };
