"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  AuthStandaloneCardHeader,
  AuthStandalonePageShell,
  authStandaloneCardClass,
} from "@/components/gestionale/auth-standalone-page";
import { GlobalLoadingView } from "@/components/design-system/global-loading";
import { pushGestionaleToast } from "@/context/toast-context";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import { dsBtnPrimary, dsLabel, dsSearchFieldInput } from "@/lib/ui/design-system";
import { validatePasswordConfirmation } from "@/lib/validation/password-validation";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

const alertErrorClass =
  "rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-surface))] px-3 py-2 text-sm text-[color:color-mix(in_srgb,var(--cab-danger)_90%,var(--cab-text))]";

type ResetPhase = "loading" | "ready" | "no_session" | "success";

export function ResetPasswordForm() {
  const router = useRouter();
  const formId = useId();
  const passwordId = `${formId}-password`;
  const confirmId = `${formId}-confirm`;

  const [phase, setPhase] = useState<ResetPhase>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isSupabasePublicEnvConfigured()) {
      setError(MISSING_SUPABASE_ENV_MESSAGE);
      setPhase("no_session");
      return;
    }

    let cancelled = false;
    const sb = getBrowserSupabase();

    const markReady = () => {
      if (!cancelled) setPhase("ready");
    };

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        markReady();
        return;
      }
      if (event === "SIGNED_IN" && session && window.location.pathname.startsWith("/login/reset-password")) {
        markReady();
      }
    });

    void (async () => {
      const { data } = await sb.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        markReady();
        return;
      }
      setPhase("no_session");
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(null);

    const validation = validatePasswordConfirmation(password, confirm);
    if (validation) {
      setFieldError(validation);
      return;
    }

    setPending(true);
    try {
      const sb = getBrowserSupabase();
      const { error: updateErr } = await sb.auth.updateUser({ password });
      if (updateErr) {
        setError("Impossibile aggiornare la password. Il link potrebbe essere scaduto.");
        return;
      }
      setPhase("success");
      pushGestionaleToast("Password aggiornata. Accesso in corso…", "success", 4200);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Impossibile aggiornare la password. Riprova tra poco.");
    } finally {
      setPending(false);
    }
  }

  if (phase === "loading") {
    return (
      <AuthStandalonePageShell>
        <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-12">
          <GlobalLoadingView message={GLOBAL_LOADING_MESSAGES.default} />
        </div>
      </AuthStandalonePageShell>
    );
  }

  return (
    <AuthStandalonePageShell>
      <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className={authStandaloneCardClass}>
          <AuthStandaloneCardHeader srOnlyTitle="Imposta nuova password" />

          {phase === "no_session" ? (
            <div className="space-y-4 text-center">
              <p className={`${alertErrorClass} text-sm`} role="alert">
                {error ?? "Link non valido o scaduto. Richiedi un nuovo link di recupero password."}
              </p>
              <Link href="/login" className={`${dsBtnPrimary} block min-h-11 w-full py-2.5 text-center text-sm font-semibold`}>
                Torna al login
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <p className="text-center text-sm text-[color:var(--cab-text-muted)]">
                Scegli una nuova password per il tuo account.
              </p>

              {error ? (
                <p className={alertErrorClass} role="alert">
                  {error}
                </p>
              ) : null}

              <div>
                <label htmlFor={passwordId} className={`block ${dsLabel} text-[color:var(--cab-text)]`}>
                  Nuova password
                </label>
                <div className="relative mt-1.5">
                <input
                  id={passwordId}
                  data-testid="smoke-reset-password"
                  type="password"
                  autoComplete="new-password"
                  className={dsSearchFieldInput}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldError(null);
                  }}
                  minLength={8}
                  maxLength={128}
                  required
                  disabled={pending}
                  aria-invalid={Boolean(fieldError)}
                />
                </div>
              </div>

              <div>
                <label htmlFor={confirmId} className={`block ${dsLabel} text-[color:var(--cab-text)]`}>
                  Conferma password
                </label>
                <div className="relative mt-1.5">
                <input
                  id={confirmId}
                  data-testid="smoke-reset-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  className={dsSearchFieldInput}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setFieldError(null);
                  }}
                  minLength={8}
                  maxLength={128}
                  required
                  disabled={pending}
                  aria-invalid={Boolean(fieldError)}
                />
                </div>
              </div>

              {fieldError ? (
                <p className={alertErrorClass} role="alert">
                  {fieldError}
                </p>
              ) : null}

              <button
                type="submit"
                className={`${dsBtnPrimary} mt-1 min-h-11 w-full justify-center py-2.5 text-sm font-semibold`}
                disabled={pending}
              >
                {pending ? "Aggiornamento…" : "Salva nuova password"}
              </button>

              <p className="text-center text-xs">
                <Link href="/login" className="text-[color:var(--cab-primary)] underline-offset-2 hover:underline">
                  Torna al login
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </AuthStandalonePageShell>
  );
}
