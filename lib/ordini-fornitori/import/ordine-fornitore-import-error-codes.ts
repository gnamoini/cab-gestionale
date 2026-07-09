/** Error codes SSOT — Ordini Fornitori Import telemetry/API. */

export const ORDINE_FORNITORE_IMPORT_ERROR_CODES = [
  "DOCUMENT_NOT_FOUND",
  "INVALID_PATH",
  "STORAGE_PERMISSION_DENIED",
  "STORAGE_NOT_FOUND",
  "STORAGE_EMPTY",
  "NOT_CONFIGURED",
  "AI_GENERATION_FAILED",
  "RATE_LIMITED",
  "UNAUTHORIZED",
  "ANALYZE_FAILED",
] as const;

export type OrdineFornitoreImportErrorCode = (typeof ORDINE_FORNITORE_IMPORT_ERROR_CODES)[number];

export function isOrdineFornitoreImportErrorCode(
  value: string,
): value is OrdineFornitoreImportErrorCode {
  return (ORDINE_FORNITORE_IMPORT_ERROR_CODES as readonly string[]).includes(value);
}

export function httpStatusForOrdineFornitoreImportError(
  code: OrdineFornitoreImportErrorCode,
): number {
  switch (code) {
    case "DOCUMENT_NOT_FOUND":
      return 404;
    case "INVALID_PATH":
    case "STORAGE_NOT_FOUND":
    case "STORAGE_EMPTY":
    case "ANALYZE_FAILED":
      return 400;
    case "STORAGE_PERMISSION_DENIED":
    case "UNAUTHORIZED":
      return 403;
    case "RATE_LIMITED":
      return 429;
    case "NOT_CONFIGURED":
      return 503;
    case "AI_GENERATION_FAILED":
      return 502;
    default:
      return 400;
  }
}
