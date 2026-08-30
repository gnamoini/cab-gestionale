"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth, isAuthFullyAuthenticated } from "@/context/auth-context";
import { clearGestionaleToasts } from "@/context/toast-context";
import {
  AuthStandaloneCardHeader,
  AuthStandalonePageShell,
  authStandaloneCardClass,
} from "@/components/gestionale/auth-standalone-page";
import { AUTH_STANDALONE_LOGO_SUBTITLE } from "@/components/gestionale/cab-logo";
import { AuthStandalonePageFooter } from "@/components/gestionale/auth-standalone-page-footer";
import { GlobalLoadingSpinner } from "@/components/design-system";
import { useGlobalLoading } from "@/context/global-loading-context";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { isStagingPublicSlice } from "@/lib/env/staging-public";
import { MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import {
  dsBtnPrimary,
  dsCheckboxInput,
  dsLabel,
  dsSearchFieldInput,
  dsTypoCaption,
} from "@/lib/ui/design-system";
import { readAuthRememberPreference } from "@/lib/auth/auth-remember-preference";
import {
  formatLoginIdentifierInput,
  isValidLoginIdentifier,
  loginIdentifierFieldError,
} from "@/src/lib/auth/username";

const LoginPostAuthRedirectLazy = dynamic(
  () =>
    import("@/app/login/login-post-auth-redirect").then((m) => ({
      default: m.LoginPostAuthRedirect,
    })),
  { ssr: false },
);

const LoginForgotPasswordModalLazy = dynamic(
  () =>
    import("@/app/login/login-forgot-password-modal").then((m) => ({
      default: m.LoginForgotPasswordModal,
    })),
);

/** Messaggi login senza esporre dettagli interni Supabase. */
function loginErrorUserMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (raw === MISSING_SUPABASE_ENV_MESSAGE) return raw;
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("fetch")) {
    return "Connessione non disponibile. Riprova tra poco.";
  }
  if (
    m.includes("invalid refresh token") ||
    m.includes("refresh token not found") ||
    m.includes("invalid jwt") ||
    m.includes("session expired") ||
    m.includes("sessione non valida")
  ) {
    return "Accesso non riuscito. Riprova.";
  }
  if (
    m.includes("invalid login") ||
    m.includes("invalid credential") ||
    m.includes("wrong password") ||
    m.includes("email not confirmed") ||
    m.includes("user not found")
  ) {
    return "Accesso non riuscito. Verifica email o nome utente e password.";
  }
  return "Accesso non riuscito. Riprova.";
}

function IconUser({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

const loginAlertErrorClass =
  "rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-surface))] px-3 py-2 text-sm text-[color:color-mix(in_srgb,var(--cab-danger)_90%,var(--cab-text))]";

const loginAlertInfoClass =
  "rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-info)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-info)_8%,var(--cab-surface))] px-3 py-2 text-sm text-[color:color-mix(in_srgb,var(--cab-info)_90%,var(--cab-text))]";

export function LoginForm() {
  const searchParams = useSearchParams();
  const { login, status, configurationError, user } = useAuth();
  const formId = useId();
  const identifierId = `${formId}-identifier`;
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
  const [redirecting, setRedirecting] = useState(false);

  const handleRedirecting = useCallback(() => setRedirecting(true), []);

  const authWaitMessage =
    redirecting
      ? null
      : status === "loading"
        ? GLOBAL_LOADING_MESSAGES.default
        : isAuthFullyAuthenticated(status)
          ? GLOBAL_LOADING_MESSAGES.redirectWorkspace
          : null;
  useGlobalLoading(authWaitMessage);

  const authWaitActive =
    !redirecting && (status === "loading" || isAuthFullyAuthenticated(status));

  const sessionExpiredNotice = searchParams.get("reason") === "session_expired";

  useEffect(() => {
    clearGestionaleToasts();
  }, []);

   
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state in effect lifecycle
    setRemember(readAuthRememberPreference());
  }, []);

  useEffect(() => {
    if (status === "loading" || status === "authenticated" || status === "degraded") return;
    const t = window.setTimeout(() => emailRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [status]);

  const openForgot = useCallback(() => {
    setForgotOpen(true);
  }, []);

  const closeForgot = useCallback(() => {
    setForgotOpen(false);
  }, []);

  if (redirecting) {
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    const identifier = formatLoginIdentifierInput(email);
    const idErr = loginIdentifierFieldError(identifier);
    if (idErr) {
      setFieldError(idErr);
      return;
    }
    if (!isValidLoginIdentifier(identifier)) {
      setFieldError("Inserisci un'email valida o un nome utente.");
      return;
    }
    if (!password) {
      setFieldError("Inserisci la password.");
      return;
    }
    setPending(true);
    try {
      const res = await login(identifier, password, remember);
      if (!res.ok) {
        setError(loginErrorUserMessage(res.message));
        return;
      }
      /* Redirect gestito da LoginPostAuthRedirect (permessi + ordine menu). */
    } finally {
      setPending(false);
    }
  }

  const busy = pending || authWaitActive;
  const configBlocked = !!configurationError;

  return (
    <AuthStandalonePageShell showThemeToggle={false} decorativeBackground="login">
      {isAuthFullyAuthenticated(status) && user?.id ? (
        <LoginPostAuthRedirectLazy onRedirecting={handleRedirecting} />
      ) : null}

      <div
        className="relative z-10 flex min-h-dvh min-w-0 flex-col"
        aria-hidden={authWaitActive || undefined}
        aria-busy={authWaitActive || undefined}
      >
        <main className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className={authStandaloneCardClass}>
          <AuthStandaloneCardHeader
            srOnlyTitle="Accedi al gestionale"
            productLabel={AUTH_STANDALONE_LOGO_SUBTITLE}
          />

          {configBlocked ? (
            <p
              className={`mb-5 ${loginAlertErrorClass} text-center text-xs`}
              role="status"
            >
              Accesso disabilitato: configurare le variabili pubbliche Supabase.
            </p>
          ) : null}

          {sessionExpiredNotice && !configBlocked ? (
            <p className={`mb-5 ${loginAlertInfoClass} text-center text-sm`} role="status">
              Sessione scaduta. Accedi di nuovo.
            </p>
          ) : null}

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="space-y-4">
              <div>
                <label htmlFor={identifierId} className={`block ${dsLabel} text-[color:var(--cab-text)]`}>
                  Email o username
                </label>
                <div className="relative mt-1.5">
                  <span className={iconInset} aria-hidden>
                    <IconUser />
                  </span>
                  <input
                    ref={emailRef}
                    id={identifierId}
                    name="identifier"
                    data-testid="smoke-login-identifier"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    placeholder="Email o username"
                    className={`${dsSearchFieldInput} min-w-0 pl-10`}
                    value={email}
                    onChange={(e) => {
                      setEmail(formatLoginIdentifierInput(e.target.value));
                      setFieldError(null);
                      setError(null);
                    }}
                    onBlur={() => {
                      if (email.trim()) setEmail(formatLoginIdentifierInput(email));
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
                </div>
                <div className="relative mt-1.5">
                  <span className={iconInset} aria-hidden>
                    <IconLock />
                  </span>
                  <input
                    id={passwordId}
                    name="password"
                    data-testid="smoke-login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`${dsSearchFieldInput} min-w-0 pl-10 pr-11`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldError(null);
                      setError(null);
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
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={openForgot}
                    disabled={busy || configBlocked}
                    className="text-xs font-medium text-[color:var(--cab-primary)] underline-offset-2 transition-colors hover:underline disabled:opacity-50"
                  >
                    Password dimenticata?
                  </button>
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 py-0.5 text-sm text-[color:var(--cab-text)]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={busy || configBlocked}
                className={dsCheckboxInput}
              />
              <span className="font-medium">Resta collegato</span>
            </label>

            {fieldError ? (
              <p
                id={`${formId}-field-err`}
                className="text-sm font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]"
                role="alert"
              >
                {fieldError}
              </p>
            ) : null}

            {error ? (
              <p className={loginAlertErrorClass} role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              data-testid="smoke-login-submit"
              disabled={busy || configBlocked}
              className={`${dsBtnPrimary} mt-1 min-h-11 w-full justify-center py-2.5 text-sm font-semibold`}
            >
              {busy ? (
                <>
                  <GlobalLoadingSpinner size="sm" tone="onPrimary" />
                  <span>Accesso in corso…</span>
                </>
              ) : (
                "Accedi"
              )}
            </button>

            <p className={`pt-1 text-center ${dsTypoCaption}`}>
              Accesso riservato agli utenti autorizzati.
              <br />
              Le credenziali sono fornite dall’amministratore.
            </p>
          </form>

          {isStagingPublicSlice() ? (
            <p className={`mt-5 text-center ${dsTypoCaption}`}>Staging · accesso controllato</p>
          ) : null}
        </div>
        </main>
        <AuthStandalonePageFooter />
      </div>

      {forgotOpen ? (
        <LoginForgotPasswordModalLazy
          formId={formId}
          initialEmail={email.trim()}
          onClose={closeForgot}
        />
      ) : null}
    </AuthStandalonePageShell>
  );
}
