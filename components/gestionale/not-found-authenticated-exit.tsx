"use client";

import Link from "next/link";
import { CabLogo } from "@/components/gestionale/cab-logo";
import {
  AuthStandalonePageShell,
  authStandaloneCardClass,
} from "@/components/gestionale/auth-standalone-page";
import { dsBtnPrimary, dsTypoCaption } from "@/lib/ui/design-system";
import { useSafeGestionaleHomeLink } from "@/components/observability/use-safe-gestionale-home-link";

export type NotFoundAuthenticatedExitProps = {
  variant: "standalone";
};

/** CTA home RBAC-aware — caricato solo con sessione attiva su 404 standalone. */
export function NotFoundAuthenticatedExit({ variant }: NotFoundAuthenticatedExitProps) {
  const safeHome = useSafeGestionaleHomeLink();

  if (variant !== "standalone") return null;

  return (
    <AuthStandalonePageShell showThemeToggle={false}>
      <main className="relative z-10 flex min-h-dvh w-full flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className={authStandaloneCardClass} role="status" aria-live="polite">
          <div className="flex justify-center">
            <CabLogo
              height={48}
              priority
              className="object-center dark:brightness-[1.08] dark:contrast-[0.95]"
            />
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--cab-text-muted)]">
              Errore 404
            </p>
            <h1 className="mt-2 text-lg font-semibold tracking-tight text-[color:var(--cab-text)]">
              Pagina non trovata
            </h1>
            <p className={`${dsTypoCaption} mx-auto mt-2 max-w-[18rem] leading-relaxed text-[color:var(--cab-text-muted)]`}>
              Il link non è valido o la pagina non è più disponibile.
            </p>
          </div>

          <div className="mt-8">
            {safeHome.ready ? (
              <Link
                href={safeHome.href}
                className={`${dsBtnPrimary} inline-flex min-h-11 w-full justify-center py-2.5 text-sm font-semibold no-underline`}
                aria-label={safeHome.label}
              >
                {safeHome.label}
              </Link>
            ) : (
              <button type="button" className={`${dsBtnPrimary} min-h-11 w-full py-2.5 text-sm font-semibold`} disabled>
                Caricamento…
              </button>
            )}
          </div>
        </div>
      </main>
    </AuthStandalonePageShell>
  );
}
