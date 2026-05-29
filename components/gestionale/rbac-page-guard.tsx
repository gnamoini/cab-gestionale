"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import {
  ACCESS_DENIED_PATH,
  defaultHomePathForRole,
  READONLY_PERMISSION_HINT,
} from "@/lib/auth/rbac";
import { canAccessRoute } from "@/src/lib/auth/can-access-route";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { dsBtnNeutral } from "@/lib/ui/design-system";

const RBAC_LOADING_FAILSAFE_MS = 8_000;

function AccessDeniedPanel({ homePath }: { homePath: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="rounded-2xl border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-8 py-10 shadow-sm">
        <p className="text-lg font-semibold text-[color:var(--cab-text)]">Accesso non autorizzato</p>
        <p className="mt-2 max-w-md text-sm text-[color:var(--cab-text-muted)]">
          Il tuo ruolo non consente l&apos;accesso a questa sezione del gestionale.
        </p>
        <Link href={homePath} className={`mt-6 inline-flex ${dsBtnNeutral}`}>
          Torna alla home
        </Link>
      </div>
    </div>
  );
}

/**
 * Blocca accesso logico alle pagine gestionale in base al RBAC centralizzato.
 * Complementa il middleware (URL diretti) con controllo client post-sessione.
 */
export function RbacPageGuard({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const clientLav = useClientLavorazioniAccess();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const [loadingFailsafe, setLoadingFailsafe] = useState(false);

  const sessionReady = isAuthSessionEstablished(status);
  const checkingClientLav =
    pathname.startsWith("/lavorazioni-clienti") && clientLav.isLoading && sessionReady;
  const checkingPerms = sessionReady && permsLoading && !loadingFailsafe;
  const showLoadingGate = status === "loading" || checkingClientLav || checkingPerms;

  useEffect(() => {
    if (!showLoadingGate) {
      setLoadingFailsafe(false);
      return;
    }
    const id = window.setTimeout(() => setLoadingFailsafe(true), RBAC_LOADING_FAILSAFE_MS);
    return () => window.clearTimeout(id);
  }, [showLoadingGate]);

  const allowed =
    sessionReady &&
    !checkingPerms &&
    canAccessRoute({
      user,
      pathname,
      opts: { clientLavorazioniAllowed: clientLav.allowed },
      snapshot,
    });

  useEffect(() => {
    if (!sessionReady || checkingClientLav || checkingPerms) return;
    if (pathname === ACCESS_DENIED_PATH) return;
    if (!allowed) {
      router.replace(`${ACCESS_DENIED_PATH}?from=${encodeURIComponent(pathname)}`);
    }
  }, [allowed, checkingClientLav, checkingPerms, pathname, router, sessionReady]);

  if (showLoadingGate && !loadingFailsafe) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-[color:var(--cab-text-muted)]">Verifica permessi…</p>
      </div>
    );
  }

  if (showLoadingGate && loadingFailsafe) {
    return (
      <>
        <div
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          Verifica permessi in ritardo — accesso con profilo base. Ricarica se qualcosa non funziona.
        </div>
        {children}
      </>
    );
  }

  if (pathname === ACCESS_DENIED_PATH) {
    return <>{children}</>;
  }

  if (!allowed) {
    return <AccessDeniedPanel homePath={defaultHomePathForRole(user)} />;
  }

  return <>{children}</>;
}

export { READONLY_PERMISSION_HINT };
