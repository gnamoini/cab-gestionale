/**
 * Converte l'input di login nell'email usata da `signInWithPassword`.
 * Se contiene `@`, si assume email completa (trim + lowercase).
 * Altrimenti: `localPart@NEXT_PUBLIC_AUTH_LOGIN_EMAIL_DOMAIN` (default `app.local` se env assente).
 */
export function resolveSignInEmail(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!t) return t;
  if (t.includes("@")) return t;
  const domain =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_AUTH_LOGIN_EMAIL_DOMAIN?.trim()) || "app.local";
  const localPart = t.replace(/[^a-z0-9._+-]/g, "").replace(/^[.]+|[.]+$/g, "") || "user";
  return `${localPart}@${domain}`;
}
