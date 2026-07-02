import type { SupabaseClient } from "@supabase/supabase-js";

export type PasswordResetResult = { ok: true } | { ok: false; message: string };

/** Messaggio UI post reset admin — sempre generico (anti-enumeration). */
export const PASSWORD_RESET_ADMIN_GENERIC_MESSAGE =
  "Se l'account esiste, riceverà un'email con le istruzioni per reimpostare la password.";

const RESET_PATH = "/login/reset-password";

export function resolvePasswordResetRedirectUrl(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}${RESET_PATH}`;
}

/** Logica condivisa reset password — no window, no browser client. */
export async function sendPasswordResetEmail(
  supabase: SupabaseClient,
  email: string,
  redirectTo: string,
): Promise<PasswordResetResult> {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, message: "Email non valida." };
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
    if (error) {
      return { ok: false, message: "Impossibile completare la richiesta. Riprova tra poco." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Impossibile completare la richiesta. Riprova tra poco." };
  }
}

/** Origin per server action admin (env obbligatorio in prod). */
export function resolvePasswordResetOriginFromEnv(): string | null {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return null;
}
