import type { SupabaseClient } from "@supabase/supabase-js";

/** Dominio email sintetica per account legacy senza riga username (fallback). */
function loginEmailDomain(): string {
  return (
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_AUTH_LOGIN_EMAIL_DOMAIN?.trim()) || "app.local"
  );
}

/** Fallback client se RPC non disponibile: `user@domain`. */
export function resolveSignInEmailLegacy(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!t) return t;
  if (t.includes("@")) return t;
  const localPart = t.replace(/[^a-z0-9._+-]/g, "").replace(/^[.]+|[.]+$/g, "") || "user";
  return `${localPart}@${loginEmailDomain()}`;
}

/**
 * Converte l'input di login nell'email usata da `signInWithPassword`.
 * Email con `@` → trim + lowercase; nome utente → lookup `profiles.username` via RPC.
 */
export async function resolveSignInEmail(sb: SupabaseClient, raw: string): Promise<string> {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const { data, error } = await sb.rpc("resolve_auth_email_for_login", {
    p_identifier: trimmed,
  });
  if (!error && typeof data === "string" && data.trim()) {
    return data.trim().toLowerCase();
  }
  if (!error && (data === null || data === "")) {
    return "";
  }
  return resolveSignInEmailLegacy(trimmed);
}
