import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";

/** MIME consentiti per allegati scheda legacy (no HTML/SVG — rischio XSS su data: URL). */
const ALLOWED_LEGACY_BLOB_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isAllowedLegacySchedaBlobMime(mime: string): boolean {
  return ALLOWED_LEGACY_BLOB_MIMES.has(mime.trim().toLowerCase());
}

export function openBlobInNewTab(mime: string, base64: string, _fileName: string): void {
  const normalized = mime.trim().toLowerCase();
  if (!isAllowedLegacySchedaBlobMime(normalized)) {
    return;
  }
  const url = `data:${normalized};base64,${base64}`;
  openUrlInNewTab(url);
}
