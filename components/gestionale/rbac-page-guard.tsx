"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import {
  ACCESS_DENIED_PATH,
  defaultHomePathForRole,
  READONLY_PERMISSION_HINT,
  resolveFirstAccessiblePageHrefFromResolved,
} from "@/lib/auth/rbac";
import { canAccessRoute } from "@/src/lib/auth/can-access-route";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { LoadingSpinner } from "@/components/design-system/loading/loading-spinner";
import { useLoadingClaim } from "@/context/global-loading-context";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";
import { dsBtnNeutral } from "@/lib/ui/design-system";
import { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";
import { lazyLogBoot, lazyTrackRedirect } from "@/lib/observability/boot-investigation-lazy";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";
import { deferredRouterReplace } from "@/lib/navigation/deferred-app-router";

const RBAC_LOADING_FAILSAFE_MS = 8_000;

function AccessDeniedPanel({ homePath }: { homePath: string }) {
  return (
    <div className="flex min-w-0 min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
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
  useBootInvestigationMount("RbacPageGuard");
  const { user, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const [loadingFailsafe, setLoadingFailsafe] = useState(false);
  const loadingGateStartedRef = useRef<number | null>(null);

  const sessionReady = isAuthSessionEstablished(status);
  const checkingPerms = sessionReady && permsLoading && !loadingFailsafe;
  const showLoadingGate = status === "loading" || checkingPerms;
  const skeletonClaimActive = showLoadingGate && !loadingFailsafe;
  useLoadingClaim("skeleton", "rbac-guard", skeletonClaimActive);

  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;
    lazyLogBoot("RENDER", "RbacPageGuard", {
      status,
      showLoadingGate,
      loadingFailsafe,
      permsLoading,
      pathname,
    });
  }, [status, showLoadingGate, loadingFailsafe, permsLoading, pathname]);

  useEffect(() => {
    if (!showLoadingGate) {
      loadingGateStartedRef.current = null;
      setLoadingFailsafe(false);
      return;
    }
    if (loadingGateStartedRef.current == null) {
      loadingGateStartedRef.current = Date.now();
    }
    const elapsed = Date.now() - loadingGateStartedRef.current;
    const remaining = Math.max(0, RBAC_LOADING_FAILSAFE_MS - elapsed);
    const id = window.setTimeout(() => setLoadingFailsafe(true), remaining);
    return () => window.clearTimeout(id);
  }, [showLoadingGate]);

  useEffect(() => {
    if (!isBootInvestigationEnabled()) return;
    if (loadingFailsafe && showLoadingGate) {
      lazyLogBoot("AUTH", "RbacPageGuard", { event: "failsafe_fired", pathname }, "loading_failsafe_8s");
    }
  }, [loadingFailsafe, showLoadingGate, pathname]);

  const allowed =
    sessionReady &&
    !checkingPerms &&
    canAccessRoute({
      pathname,
      snapshot,
    });

  useEffect(() => {
    if (!sessionReady || checkingPerms) return;
    if (pathname === ACCESS_DENIED_PATH) return;
    if (!allowed) {
      const to = `${ACCESS_DENIED_PATH}?from=${encodeURIComponent(pathname)}`;
      lazyTrackRedirect(pathname, to, "rbac_denied", "rbac");
      deferredRouterReplace(router, to);
    }
  }, [allowed, checkingPerms, pathname, router, sessionReady]);

  if (showLoadingGate && !loadingFailsafe) {
    return (
      <div className="flex min-w-0 min-h-[40vh] items-center justify-center" aria-busy="true" aria-label={GLOBAL_LOADING_MESSAGES.permessi}>
        <LoadingSpinner size="md" label={GLOBAL_LOADING_MESSAGES.permessi} />
      </div>
    );
  }

  if (showLoadingGate && loadingFailsafe) {
    return (
      <div className="flex min-w-0 min-h-[40vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <div className="rounded-2xl border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-8 py-10 shadow-sm">
          <p className="text-lg font-semibold text-[color:var(--cab-text)]">Verifica permessi non completata</p>
          <p className="mt-2 max-w-md text-sm text-[color:var(--cab-text-muted)]">
            Impossibile confermare i permessi in tempo utile. Ricarica la pagina o contatta un amministratore se il
            problema persiste.
          </p>
          <button
            type="button"
            className={`mt-6 inline-flex ${dsBtnNeutral}`}
            onClick={() => window.location.reload()}
          >
            Ricarica pagina
          </button>
        </div>
      </div>
    );
  }

  if (pathname === ACCESS_DENIED_PATH) {
    return <>{children}</>;
  }

  if (!allowed) {
    return (
      <AccessDeniedPanel
        homePath={
          snapshot?.resolved
            ? resolveFirstAccessiblePageHrefFromResolved(snapshot.resolved)
            : defaultHomePathForRole(user, { rolePageAccess: snapshot?.rolePageAccess })
        }
      />
    );
  }

  return <>{children}</>;
}

export { READONLY_PERMISSION_HINT };
