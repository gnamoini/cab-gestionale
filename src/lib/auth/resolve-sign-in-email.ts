import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveLoginEmailAction } from "@/src/actions/resolve-login-email";

/** Dominio email sintetica per account legacy senza riga username (fallback). */
function loginEmailDomain(): string {
  return (
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_AUTH_LOGIN_EMAIL_DOMAIN?.trim()) || "app.local"
  );
}

/** Fallback se RPC server non disponibile: `user@domain`. */
export function resolveSignInEmailLegacy(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!t) return t;
  if (t.includes("@")) return t;
  const localPart = t.replace(/[^a-z0-9._+-]/g, "").replace(/^[.]+|[.]+$/g, "") || "user";
  return `${localPart}@${loginEmailDomain()}`;
}

/**
 * Converte l'input di login nell'email usata da `signInWithPassword`.
 * Email con `@` → trim + lowercase locale; username → Server Action (service role).
 */
export async function resolveSignInEmail(_sb: SupabaseClient, raw: string): Promise<string> {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  const { email } = await resolveLoginEmailAction(trimmed);
  return email;
}
