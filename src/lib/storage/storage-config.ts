/** Bucket Supabase Storage — unica fonte di verità per i nomi. */
export const STORAGE_BUCKETS = {
  images: "images",
  documenti: "documenti",
  documentiThumbnails: "documenti-thumbnails",
  pdfArtifacts: "pdf-artifacts",
} as const;

export type StorageBucketId = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export const IMAGE_STORAGE_SCOPES = ["mezzi", "magazzino", "lavorazioni"] as const;

export type ImageStorageScope = (typeof IMAGE_STORAGE_SCOPES)[number];

export const STORAGE_LIMITS = {
  imagesMaxBytes: 10 * 1024 * 1024,
  documentiMaxBytes: 100 * 1024 * 1024,
  pdfArtifactsMaxBytes: 15 * 1024 * 1024,
  documentiThumbnailsMaxBytes: 2 * 1024 * 1024,
  imagesMaxPerRecord: 10,
} as const;

export function isImageStorageScope(value: string): value is ImageStorageScope {
  return (IMAGE_STORAGE_SCOPES as readonly string[]).includes(value);
}
