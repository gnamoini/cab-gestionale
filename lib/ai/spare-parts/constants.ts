export const SPARE_PARTS_UPLOAD_LIMITS = {
  maxPhotos: 6,
  maxPhotoBytes: 8 * 1024 * 1024,
  maxTotalPhotoBytes: 32 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const,
} as const;

export const SPARE_PARTS_INDEX_MAX_ATTEMPTS = 5;

/** ponytail: soglia fissa — upgrade path = lease_expires_at come ai_part_searches */
export const DOCUMENT_INDEX_PROCESSING_STALE_MS = 30 * 60_000;
