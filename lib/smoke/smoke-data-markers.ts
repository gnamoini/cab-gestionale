/** Marker dati creati dagli smoke Playwright CI (spec 13/14/05). */

export const SMOKE_AUDIT_TOKEN_RE = /AUDIT-\d{8}-\d{6}/;
export const SMOKE_RICAMBIO_CODICE_RE = /^E2E-\d+$/i;
export const SMOKE_DOCUMENT_FILENAME_MARKER = "smoke-doc";

/** True se la stringa contiene un token AUDIT-YYYYMMDD-HHMMSS smoke. */
export function containsSmokeAuditToken(value: string | null | undefined): boolean {
  if (!value) return false;
  return SMOKE_AUDIT_TOKEN_RE.test(value);
}

/** True se il codice ricambio è E2E-{timestamp} creato da spec 14. */
export function isSmokeRicambioCodice(value: string | null | undefined): boolean {
  if (!value) return false;
  return SMOKE_RICAMBIO_CODICE_RE.test(value.trim());
}

/** True se nome file documento smoke (spec 05). */
export function isSmokeDocumentFilename(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.toLowerCase().includes(SMOKE_DOCUMENT_FILENAME_MARKER);
}

/** Estrae tutti i token AUDIT smoke da un testo (es. JSON scheda). */
export function extractSmokeAuditTokens(value: string): string[] {
  return [...value.matchAll(new RegExp(SMOKE_AUDIT_TOKEN_RE.source, "g"))].map((m) => m[0]!);
}
