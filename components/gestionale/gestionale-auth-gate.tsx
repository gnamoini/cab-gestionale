"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { clearGestionaleToasts } from "@/context/toast-context";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import { useGestionaleTopNotice } from "@/components/gestionale/gestionale-top-notice";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { isBootInvestigationEnabled, logBoot, trackRedirect } from "@/lib/observability/boot-investigation";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";
import { deferredRouterReplace } from "@/lib/navigation/deferred-app-router";

const AUTH_NOTICE_DELAY_MS = 300;
const LOGIN_PATH_PREFIX = "/login";

function isLoginPath(pathname: string): boolean {
  return pathname === LOGIN_PATH_PREFIX || pathname.startsWith(`${LOGIN_PATH_PREFIX}/`);
}

/**
 * Dopo il proxy (cookie sessione Supabase), sincronizza con `AuthProvider`
 * e reindirizza al login se la sessione client risulta assente.
 * Shell-first: sidebar/header restano visibili; notifica compatta fissa in cima.
 */
export function GestionaleAuthGate({ children }: { children: React.ReactNode }) {
  const { status, configurationError, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useBootInvestigationMount("GestionaleAuthGate", { status });
  const configBlocked = !isSupabasePublicEnvConfigured() || !!configurationError;
  const hadEstablishedSessionRef = useRef(false);
  const loginRedirectInFlightRef = useRef(false);
  const anonymousReconcileDoneRef = useRef(false);

  useEffect(() => {
    if (status === "authenticated" || status === "degraded") {
      hadEstablishedSessionRef.current = true;
    }
  }, [status]);

  useEffect(() => {
    if (configBlocked) return;
    if (status !== "anonymous") {
      anonymousReconcileDoneRef.current = false;
      return;
    }
    if (anonymousReconcileDoneRef.current) return;

    let cancelled = false;
    anonymousReconcileDoneRef.current = true;

    void (async () => {
      const verdict = await refresh({ force: true });
      if (cancelled) return;
      if (verdict === "valid" || verdict === "pending" || verdict === null) return;
      if (isLoginPath(pathname)) return;
      if (loginRedirectInFlightRef.current) return;

      loginRedirectInFlightRef.current = true;
      clearGestionaleToasts();
      const qs = window.location.search;
      const from = qs ? `${pathname}${qs}` : pathname;
      const params = new URLSearchParams();
      params.set("from", from || "/dashboard");
      if (hadEstablishedSessionRef.current) {
        params.set("reason", "session_expired");
      }
      const to = `/login?${params.toString()}`;
      trackRedirect(pathname, to, hadEstablishedSessionRef.current ? "session_expired" : "anonymous", "auth_gate");
      if (isBootInvestigationEnabled()) {
        logBoot("AUTH", "auth_gate_redirect", { to, hadSession: hadEstablishedSessionRef.current });
      }
      deferredRouterReplace(router, to);
    })();

    return () => {
      cancelled = true;
    };
  }, [status, configBlocked, router, pathname, refresh]);

  const showAuthBanner =
    !configBlocked && (status === "loading" || status === "anonymous");
  const bannerMessage =
    status === "loading"
      ? GLOBAL_LOADING_MESSAGES.session
      : status === "anonymous"
        ? GLOBAL_LOADING_MESSAGES.redirectLogin
        : GLOBAL_LOADING_MESSAGES.session;

  useGestionaleTopNotice("auth", {
    visible: showAuthBanner,
    message: bannerMessage,
    busy: true,
    showDelayMs: AUTH_NOTICE_DELAY_MS,
  });

  if (configBlocked) {
    return (
      <div className="flex min-w-0 min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="max-w-lg text-sm font-semibold text-[color:var(--cab-text)]" role="alert">
          {MISSING_SUPABASE_ENV_MESSAGE}
        </p>
        <p className="max-w-md text-xs text-[color:var(--cab-text-muted)]">
          Impossibile usare il gestionale senza le variabili pubbliche Supabase. Configura{" "}
          <code className="rounded bg-[var(--cab-surface-2)] px-1">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code className="rounded bg-[var(--cab-surface-2)] px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (solo anon key) nel deploy.
        </p>
        <Link href="/login" className={`inline-flex ${dsBtnNeutral}`}>
          Vai al login
        </Link>
      </div>
    );
  }

  return (
    <div className={status === "loading" ? "pointer-events-none opacity-95" : undefined}>{children}</div>
  );
}
