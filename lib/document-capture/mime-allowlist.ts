export const DOCUMENT_CAPTURE_DIRECT_OCR_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

/** Convertiti in PDF lato server prima dell'OCR. */
export const DOCUMENT_CAPTURE_OFFICE_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
] as const;

export const DOCUMENT_CAPTURE_MIME_ALLOWLIST = [
  ...DOCUMENT_CAPTURE_DIRECT_OCR_MIME,
  ...DOCUMENT_CAPTURE_OFFICE_MIME,
] as const;

export const DOCUMENT_CAPTURE_MAX_BYTES = 15 * 1024 * 1024;

export function isAllowedCaptureMime(mime: string): boolean {
  return (DOCUMENT_CAPTURE_MIME_ALLOWLIST as readonly string[]).includes(mime.trim().toLowerCase());
}

export function isCaptureOfficeMime(mime: string): boolean {
  return (DOCUMENT_CAPTURE_OFFICE_MIME as readonly string[]).includes(mime.trim().toLowerCase());
}

export function needsCaptureOfficeConversion(mime: string): boolean {
  return isCaptureOfficeMime(mime);
}
