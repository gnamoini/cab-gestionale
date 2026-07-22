/** Error codes SSOT — Document Capture telemetry/API. */

export const DOCUMENT_CAPTURE_ERROR_CODES = [
  "UPLOAD_FAILED",
  "STORAGE_PERMISSION_DENIED",
  "STORAGE_NOT_FOUND",
  "STORAGE_EMPTY",
  "ANALYZE_TIMEOUT",
  "ANALYZE_GEMINI_SCHEMA",
  "ANALYZE_GEMINI_FAIL",
  "ANALYZE_STORAGE",
  "ANALYZE_PREREQUISITES",
  "PLAN_STALE",
  "APPLY_FAILED",
  "APPLY_IN_PROGRESS",
  "UNAUTHORIZED",
  "TENANT_MISSING",
  "RATE_LIMITED",
  "NOT_CONFIGURED",
  "NO_SIGNATURES",
] as const;

export type DocumentCaptureErrorCode = (typeof DOCUMENT_CAPTURE_ERROR_CODES)[number];

export function isDocumentCaptureErrorCode(value: string): value is DocumentCaptureErrorCode {
  return (DOCUMENT_CAPTURE_ERROR_CODES as readonly string[]).includes(value);
}
