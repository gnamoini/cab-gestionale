/** Env kill switch — default false in production deploy. */

export function isExternalEmailAllowed(): boolean {
  const raw = process.env.ALLOW_EXTERNAL_EMAILS?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export type ExternalEmailGuardResult =
  | { allowed: true; reason: "external_enabled" }
  | { allowed: false; reason: "external_blocked" };

export function evaluateExternalEmailGuard(): ExternalEmailGuardResult {
  if (isExternalEmailAllowed()) return { allowed: true, reason: "external_enabled" };
  return { allowed: false, reason: "external_blocked" };
}
