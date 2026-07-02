export const DOCUMENT_CAPTURE_MIME_ALLOWLIST = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const DOCUMENT_CAPTURE_MAX_BYTES = 15 * 1024 * 1024;

export function isAllowedCaptureMime(mime: string): boolean {
  return (DOCUMENT_CAPTURE_MIME_ALLOWLIST as readonly string[]).includes(mime.trim().toLowerCase());
}
