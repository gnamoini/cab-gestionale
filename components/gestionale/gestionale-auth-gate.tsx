"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import { useGestionaleTopNotice } from "@/components/gestionale/gestionale-top-notice";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";

const AUTH_NOTICE_DELAY_MS = 300;

/**
 * Dopo il proxy (cookie sessione Supabase), sincronizza con `AuthProvider`
 * e reindirizza al login se la sessione client risulta assente.
 * Shell-first: sidebar/header restano visibili; notifica compatta fissa in cima.
 */
export function GestionaleAuthGate({ children }: { children: React.ReactNode }) {
  const { status, configurationError, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const configBlocked = !isSupabasePublicEnvConfigured() || !!configurationError;

  useEffect(() => {
    if (configBlocked) return;
    if (status !== "anonymous") return;
    const qs = window.location.search;
    const from = qs ? `${pathname}${qs}` : pathname;
    router.replace(`/login?from=${encodeURIComponent(from || "/dashboard")}`);
  }, [status, configBlocked, router, pathname]);

  useEffect(() => {
    if (configBlocked) return;
    if (status !== "degraded") return;
    void refresh();
  }, [status, configBlocked, refresh]);

  const showAuthBanner = !configBlocked && (status === "loading" || status === "degraded" || status === "anonymous");
  const bannerMessage =
    status === "degraded"
      ? "Verifica sessione in corso…"
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
