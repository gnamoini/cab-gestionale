"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { ThemeToggle } from "@/components/gestionale/theme-toggle";
import { isStagingBlockedPathname, isStagingPublicSlice } from "@/lib/env/staging-public";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsLabel,
  dsModalBackdrop,
  dsModalPanel,
  dsSearchFieldInput,
  dsSurfaceCard,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

function safeRedirectTarget(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/login")) return "/dashboard";
  const pathOnly = raw.split("?")[0] ?? raw;
  if (isStagingPublicSlice() && isStagingBlockedPathname(pathOnly)) {
    return "/dashboard?staging_unavailable=1";
  }
  return raw;
}

function isValidEmailFormat(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Messaggi login senza esporre dettagli interni Supabase. */
function loginErrorUserMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (raw === MISSING_SUPABASE_ENV_MESSAGE) return raw;
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("fetch")) {
    return "Connessione non disponibile. Riprova tra poco.";
  }
  if (
    m.includes("invalid login") ||
    m.includes("invalid credential") ||
    m.includes("wrong password") ||
    m.includes("email not confirmed") ||
    m.includes("user not found")
  ) {
    return "Accesso non riuscito. Verifica email e password.";
  }
  return "Accesso non riuscito. Riprova.";
}

function IconMail({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconLock({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function IconEye({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function IconEyeOff({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

const iconInset = "pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[color:var(--cab-text-muted)]";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, status, configurationError } = useAuth();
  const formId = useId();
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPending, setResetPending] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" && status !== "degraded") return;
    const target = safeRedirectTarget(searchParams.get("from"));
    router.replace(target);
    router.refresh();
  }, [status, router, searchParams]);

  useEffect(() => {
    if (status === "loading" || status === "authenticated" || status === "degraded") return;
    const t = window.setTimeout(() => emailRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [status]);

  const openForgot = useCallback(() => {
    setResetEmail(email.trim());
    setResetDone(false);
    setResetError(null);
    setForgotOpen(true);
  }, [email]);

  const closeForgot = useCallback(() => {
    setForgotOpen(false);
    setResetPending(false);
    setResetDone(false);
    setResetError(null);
  }, []);

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetDone(false);
    const trimmed = resetEmail.trim();
    if (!isValidEmailFormat(trimmed)) {
      setResetError("Inserisci un indirizzo email valido.");
      return;
    }
    if (!isSupabasePublicEnvConfigured()) {
      setResetError("Servizio non disponibile. Controlla la configurazione.");
      return;
    }
    setResetPending(true);
    try {
      const sb = getBrowserSupabase();
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
      const { error: err } = await sb.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (err) {
        setResetError("Impossibile completare la richiesta. Riprova tra poco.");
        return;
      }
      setResetDone(true);
    } catch {
      setResetError("Impossibile completare la richiesta. Riprova tra poco.");
    } finally {
      setResetPending(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--cab-bg-app)] px-4 text-sm text-[color:var(--cab-text-muted)]">
        Caricamento…
      </div>
    );
  }

  if (status === "authenticated" || status === "degraded") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--cab-bg-app)] px-4 text-sm text-[color:var(--cab-text-muted)]">
        Reindirizzamento…
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    if (!isValidEmailFormat(email)) {
      setFieldError("Inserisci un indirizzo email valido.");
      return;
    }
    if (!password) {
      setFieldError("Inserisci la password.");
      return;
    }
    setPending(true);
    try {
      const res = await login(email, password, remember);
      if (!res.ok) {
        setError(loginErrorUserMessage(res.message));
        return;
      }
      const target = safeRedirectTarget(searchParams.get("from"));
      router.replace(target);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const busy = pending;
  const configBlocked = !!configurationError;

  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--cab-bg-app)] lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,28rem)]">
      <div
        className="relative hidden min-h-[12rem] shrink-0 overflow-hidden bg-gradient-to-br from-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-bg-app))] via-[var(--cab-bg-app)] to-[var(--cab-surface-2)] lg:block lg:min-h-0"
        aria-hidden
      >
        <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative flex h-full min-h-dvh flex-col justify-end p-10 xl:p-14">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-[var(--ds-radius-xl)] bg-[var(--cab-primary)] text-base font-bold text-white shadow-[var(--cab-shadow-md)]">
            CAB
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--cab-text-muted)]">Gestionale officina</p>
          <h2 className="mt-2 max-w-md text-2xl font-semibold tracking-tight text-[color:var(--cab-text)] xl:text-3xl">
            Manutenzione e operatività in un solo posto.
          </h2>
          <p className={`mt-3 max-w-sm ${dsTypoCaption} text-[color:var(--cab-text-muted)]`}>
            Magazzino, lavorazioni, documenti e report: accesso riservato al team autorizzato.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:py-12">
        <div className={`relative w-full max-w-md p-6 sm:p-8 ${dsSurfaceCard}`}>
          <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
            <ThemeToggle />
          </div>

          <div className="mb-8 pr-12">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--cab-text-muted)]">Accesso</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[color:var(--cab-text)]">Bentornato</h1>
            <p className={`mt-2 ${dsTypoCaption} max-w-sm`}>Accedi con le credenziali aziendali per continuare.</p>
          </div>

          {configBlocked ? (
            <p className="mb-4 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border)_80%,var(--cab-border-strong))] bg-[var(--cab-surface-2)] px-3 py-2 text-center text-xs text-[color:var(--cab-text-muted)]" role="status">
              Accesso disabilitato: correggere la configurazione indicata nel banner in alto (variabili pubbliche Supabase).
            </p>
          ) : null}

          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor={emailId} className={`block ${dsLabel} text-[color:var(--cab-text)]`}>
                Email
              </label>
              <div className="relative mt-1.5">
                <span className={iconInset} aria-hidden>
                  <IconMail />
                </span>
                <input
                  ref={emailRef}
                  id={emailId}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className={`${dsSearchFieldInput} pl-10`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldError(null);
                  }}
                  disabled={busy || configBlocked}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? `${formId}-field-err` : undefined}
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={passwordId} className={`${dsLabel} text-[color:var(--cab-text)]`}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={openForgot}
                  disabled={busy || configBlocked || resetPending}
                  className="shrink-0 text-xs font-medium text-[color:var(--cab-primary)] underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Password dimenticata?
                </button>
              </div>
              <div className="relative mt-1.5">
                <span className={iconInset} aria-hidden>
                  <IconLock />
                </span>
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`${dsSearchFieldInput} pl-10 pr-11`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldError(null);
                  }}
                  disabled={busy || configBlocked}
                  aria-invalid={Boolean(fieldError)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={busy || configBlocked}
                  className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-[var(--ds-radius-lg)] p-1.5 text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)] disabled:opacity-50"
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-[var(--ds-radius-lg)] border border-transparent py-0.5 text-sm text-[color:var(--cab-text)]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={busy || configBlocked}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[color:var(--cab-border-strong)] text-[var(--cab-primary)] focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_40%,transparent)]"
              />
              <span>
                <span className="font-medium">Resta collegato</span>
                <span className={`mt-0.5 block ${dsTypoCaption}`}>
                  Sessione attiva su questo dispositivo fino al logout; rinnovo token gestito automaticamente.
                </span>
              </span>
            </label>

            {fieldError ? (
              <p id={`${formId}-field-err`} className="text-sm font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_85%,var(--cab-text))]" role="alert">
                {fieldError}
              </p>
            ) : null}

            {error ? (
              <p
                className="rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-surface))] px-3 py-2.5 text-sm text-[color:color-mix(in_srgb,var(--cab-danger)_90%,var(--cab-text))]"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={busy || configBlocked} className={`${dsBtnPrimary} min-h-12 w-full justify-center py-3 text-base font-semibold`}>
              {busy ? "Accesso in corso…" : "Accedi"}
            </button>
          </form>

          <p className={`mt-6 text-center ${dsTypoCaption}`}>
            {isStagingPublicSlice() ? "Staging pubblico · accesso controllato" : "Accesso riservato · credenziali fornite dall’amministratore"}
          </p>
        </div>
      </div>

      {forgotOpen ? (
        <div className={dsModalBackdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && closeForgot()}>
          <div
            className={`${dsModalPanel} relative mx-auto max-w-md`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${formId}-forgot-title`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id={`${formId}-forgot-title`} className="text-base font-semibold text-[color:var(--cab-text)]">
              Recupero password
            </h2>
            <p className={`mt-1 ${dsTypoCaption}`}>
              Riceverai un link per reimpostare la password se l&apos;indirizzo è associato a un account.
            </p>

            {resetDone ? (
              <p className="mt-4 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-success)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-success)_12%,var(--cab-surface))] px-3 py-2.5 text-sm text-[color:var(--cab-text)]" role="status">
                <span className="font-medium">Email inviata se l&apos;account esiste.</span>
                <span className={`mt-1 block ${dsTypoCaption}`}>Controlla anche la cartella spam.</span>
              </p>
            ) : (
              <form onSubmit={submitReset} className="mt-4 space-y-4">
                <div>
                  <label htmlFor={`${formId}-reset-email`} className={`block ${dsLabel} text-[color:var(--cab-text)]`}>
                    Email
                  </label>
                  <div className="relative mt-1.5">
                    <span className={iconInset} aria-hidden>
                      <IconMail />
                    </span>
                    <input
                      id={`${formId}-reset-email`}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className={`${dsSearchFieldInput} pl-10`}
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={resetPending}
                    />
                  </div>
                </div>
                {resetError ? (
                  <p className="text-sm font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]" role="alert">
                    {resetError}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button type="button" className={dsBtnNeutral} onClick={closeForgot} disabled={resetPending}>
                    Chiudi
                  </button>
                  <button type="submit" className={dsBtnPrimary} disabled={resetPending}>
                    {resetPending ? "Invio…" : "Invia istruzioni"}
                  </button>
                </div>
              </form>
            )}

            {resetDone ? (
              <div className="mt-4 flex justify-end">
                <button type="button" className={dsBtnPrimary} onClick={closeForgot}>
                  Ho capito
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
