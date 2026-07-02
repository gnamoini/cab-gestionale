"use client";

import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import {
  resolvePasswordResetRedirectUrl,
  sendPasswordResetEmail,
  type PasswordResetResult,
} from "@/lib/auth/password-reset";

export type { PasswordResetResult };

/** Wrapper browser — stesso flusso del login. */
export async function requestPasswordResetEmail(email: string): Promise<PasswordResetResult> {
  if (!isSupabasePublicEnvConfigured()) {
    return { ok: false, message: "Servizio non disponibile. Controlla la configurazione." };
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (!origin) {
    return { ok: false, message: "Servizio non disponibile." };
  }
  const sb = getBrowserSupabase();
  return sendPasswordResetEmail(sb, email, resolvePasswordResetRedirectUrl(origin));
}
