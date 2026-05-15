"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { isSupabasePublicEnvConfigured, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env/supabase-public";
import { dsBtnNeutral } from "@/lib/ui/design-system";

/**
 * Dopo il middleware (cookie sessione Supabase), sincronizza con `AuthProvider`
 * e reindirizza al login se la sessione client risulta assente.
 */
export function GestionaleAuthGate({ children }: { children: React.ReactNode }) {
  const { status, configurationError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const configBlocked = !isSupabasePublicEnvConfigured() || !!configurationError;

  useEffect(() => {
    if (configBlocked) return;
    if (status !== "anonymous") return;
    const from = `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`;
    router.replace(`/login?from=${encodeURIComponent(from || "/dashboard")}`);
  }, [status, configBlocked, router, pathname]);

  if (configBlocked) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
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

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-[color:var(--cab-border)] border-t-[color:var(--cab-primary)]"
          aria-hidden
        />
        <p className="text-sm font-medium text-[color:var(--cab-text-muted)]">Caricamento sessione…</p>
      </div>
    );
  }

  if (status === "anonymous") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4 py-16 text-center">
        <p className="text-sm text-[color:var(--cab-text-muted)]">Reindirizzamento al login…</p>
      </div>
    );
  }

  return <>{children}</>;
}
