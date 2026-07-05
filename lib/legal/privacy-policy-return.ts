export const PRIVACY_POLICY_PATH = "/privacy-policy";

/** Path interno di ritorno da inserire in query `from`. */
export function buildPrivacyPolicyHref(returnPath: string): string {
  const path = returnPath.trim() || "/login";
  return `${PRIVACY_POLICY_PATH}?from=${encodeURIComponent(path)}`;
}

/** Valida `from` — solo path interni, mai loop su privacy policy. */
export function sanitizePrivacyPolicyReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  const pathOnly = trimmed.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (pathOnly === PRIVACY_POLICY_PATH) return null;
  return trimmed;
}
