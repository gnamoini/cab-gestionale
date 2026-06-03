"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSafeGestionaleHomeLink } from "@/components/observability/use-safe-gestionale-home-link";
import { CabLogo } from "@/components/gestionale/cab-logo";
import {
  AuthStandalonePageShell,
  authStandaloneCardClass,
} from "@/components/gestionale/auth-standalone-page";
import {
  dsBtnPrimary,
  dsFocus,
  dsTypoCaption,
  dsTypoSmall,
} from "@/lib/ui/design-system";

function StandaloneNotFoundContent() {
  const safeHome = useSafeGestionaleHomeLink();

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

/** Variante in-app (con sidebar): pannello compatto. */
function EmbeddedNotFoundPanel() {
  const router = useRouter();
  const safeHome = useSafeGestionaleHomeLink();

  const homeHref = safeHome.ready ? safeHome.href : "/login";

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(homeHref);
  };

  return (
    <div
      className={`${authStandaloneCardClass} max-w-md`}
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--cab-text-muted)]">
        Errore 404
      </p>
      <h1 className="mt-2 text-base font-semibold text-[color:var(--cab-text)]">Pagina non trovata</h1>
      <p className={`${dsTypoSmall} mt-2 leading-relaxed text-[color:var(--cab-text-muted)]`}>
        Il link non è valido o la pagina non è più disponibile.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {safeHome.ready ? (
          <Link href={safeHome.href} className={`${dsBtnPrimary} inline-flex justify-center no-underline sm:order-2`}>
            {safeHome.label}
          </Link>
        ) : (
          <button type="button" className={`${dsBtnPrimary} sm:order-2`} disabled>
            Caricamento…
          </button>
        )}
        <button
          type="button"
          onClick={goBack}
          className={`text-sm font-medium text-[color:var(--cab-text-muted)] underline-offset-2 hover:text-[color:var(--cab-text)] hover:underline sm:order-1 ${dsFocus}`}
        >
          Indietro
        </button>
      </div>
    </div>
  );
}

export type NotFoundViewProps = {
  /** Dentro AppShell gestionale (nav laterale visibile). */
  variant?: "standalone" | "embedded";
};

export function NotFoundView({ variant = "standalone" }: NotFoundViewProps) {
  if (variant === "embedded") {
    return (
      <div className="flex min-h-[min(28rem,60vh)] min-w-0 flex-col items-center justify-center px-2 py-8 sm:py-12">
        <EmbeddedNotFoundPanel />
      </div>
    );
  }

  return <StandaloneNotFoundContent />;
}
