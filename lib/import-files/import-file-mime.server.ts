export const IMPORT_SOURCES_MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/octet-stream",
]);

export function isAllowedImportFileMime(mime: string): boolean {
  const normalized = mime.trim().toLowerCase();
  return ALLOWED.has(normalized);
}
