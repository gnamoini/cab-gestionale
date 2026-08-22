export const TERMS_AND_CONDITIONS_PATH = "/termini-e-condizioni";

/** Path interno di ritorno da inserire in query `from`. */
export function buildTermsAndConditionsHref(returnPath: string): string {
  const path = returnPath.trim() || "/login";
  return `${TERMS_AND_CONDITIONS_PATH}?from=${encodeURIComponent(path)}`;
}

/** Valida `from` — solo path interni, mai loop su termini e condizioni. */
export function sanitizeTermsAndConditionsReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  const pathOnly = trimmed.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (pathOnly === TERMS_AND_CONDITIONS_PATH) return null;
  return trimmed;
}
