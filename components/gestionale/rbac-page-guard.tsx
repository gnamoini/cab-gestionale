"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, isAuthFullyAuthenticated } from "@/context/auth-context";
import {
  ACCESS_DENIED_PATH,
  canAccessPage,
  defaultHomePathForRole,
  READONLY_PERMISSION_HINT,
} from "@/lib/auth/rbac";
import { useClientLavorazioniAccess } from "@/src/hooks/use-client-lavorazioni-access";
import { dsBtnNeutral } from "@/lib/ui/design-system";

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

  const sessionReady = isAuthFullyAuthenticated(status);
  const checkingClientLav =
    pathname.startsWith("/lavorazioni-clienti") && clientLav.isLoading && sessionReady;

  const allowed =
    sessionReady &&
    canAccessPage(user, pathname, {
      clientLavorazioniAllowed: clientLav.allowed,
    });

  useEffect(() => {
    if (!sessionReady || checkingClientLav) return;
    if (pathname === ACCESS_DENIED_PATH) return;
    if (!allowed) {
      router.replace(`${ACCESS_DENIED_PATH}?from=${encodeURIComponent(pathname)}`);
    }
  }, [allowed, checkingClientLav, pathname, router, sessionReady]);

  if (status === "loading" || checkingClientLav) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-[color:var(--cab-text-muted)]">Verifica permessi…</p>
      </div>
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
