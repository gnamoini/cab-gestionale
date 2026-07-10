import "server-only";

/** Feature flag v4.1 — default on (Sprint 3); set DOCUMENT_CAPTURE_V41=0 to force legacy. */
export function isDocumentCaptureV41Enabled(): boolean {
  return process.env.DOCUMENT_CAPTURE_V41 !== "0";
}
