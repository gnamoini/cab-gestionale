/** Caratteri non ammessi nei nomi file (Windows / browser). */
export const INVALID_PDF_FILE_NAME_CHARS = /[\\/:*?"<>|]/g;

/** Sanitizza una parte del nome file PDF. */
export function sanitizePdfFileNamePart(raw: string, fallback: string): string {
  return (
    raw
      .trim()
      .replace(INVALID_PDF_FILE_NAME_CHARS, " ")
      .replace(/\s+/g, " ")
      .trim() || fallback
  );
}

/** Data locale in formato yyyy-mm-dd (nome file). */
export function formatPdfFileNameDateYmd(isoOrDate: string | Date): string {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
