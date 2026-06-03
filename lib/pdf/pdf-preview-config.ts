/** Endpoint canonico anteprima PDF (pass-through multi-istanza safe). */
export const PDF_PREVIEW_API_PATH = "/api/pdf/preview";

/** @deprecated Usare {@link PDF_PREVIEW_API_PATH}. Proxy attivo con header Deprecation. */
export const PDF_PREVIEW_LEGACY_API_PATH = "/api/preventivi/pdf-anteprima";

export const PDF_PREVIEW_MAX_BYTES = 15 * 1024 * 1024;

/** Magic bytes PDF (%PDF-) — primi 5 byte del file. */
export const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
