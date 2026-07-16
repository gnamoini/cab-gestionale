/** Feature flag hybrid — default on; DOCUMENT_CAPTURE_HYBRID_EXTRACTION=0 → Gemini-only. */
export function isDocumentCaptureHybridExtractionEnabled(): boolean {
  return process.env.DOCUMENT_CAPTURE_HYBRID_EXTRACTION !== "0";
}
