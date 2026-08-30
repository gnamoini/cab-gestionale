"use client";

import { isSupabasePublicEnvConfigured } from "@/lib/env/supabase-public";
import {
  PASSWORD_RESET_ADMIN_GENERIC_MESSAGE,
  type PasswordResetResult,
} from "@/lib/auth/password-reset";

export type { PasswordResetResult };

/** Wrapper browser — invio branded via API server (Resend + layout CAB). */
export async function requestPasswordResetEmail(email: string): Promise<PasswordResetResult> {
  if (!isSupabasePublicEnvConfigured()) {
    return { ok: false, message: "Servizio non disponibile. Controlla la configurazione." };
  }
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, message: "Email non valida." };
  }

  try {
    const res = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!res.ok) {
      return {
        ok: false,
        message: data.error?.trim() || "Impossibile completare la richiesta. Riprova tra poco.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Impossibile completare la richiesta. Riprova tra poco." };
  }
}

export { PASSWORD_RESET_ADMIN_GENERIC_MESSAGE };
