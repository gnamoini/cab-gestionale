"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authStandaloneCardClass } from "@/components/gestionale/auth-standalone-page";
import {
  useAccessibleQuickNavLinks,
  useSafeGestionaleHomeLink,
} from "@/components/observability/use-safe-gestionale-home-link";
import {
  buildTechnicalDetail,
  friendlyDescription,
} from "@/lib/observability/error-message-humanize";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsFocus,
  dsTypoSmall,
} from "@/lib/ui/design-system";

export type GestionaleErrorFallbackProps = {
  variant: "root" | "gestionale" | "global";
  message?: string;
  digest?: string;
  onRetry?: () => void;
};

function ErrorWarningIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-[color:color-mix(in_srgb,var(--cab-danger)_85%,var(--cab-text))]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function DetailsChevron() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-90"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function TechnicalDetails({ detail }: { detail: string }) {
  return (
    <details className="group mt-4 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))]">
      <summary
        className={`flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-[color:var(--cab-text-muted)] transition-colors hover:text-[color:var(--cab-text)] [&::-webkit-details-marker]:hidden ${dsFocus}`}
      >
        <DetailsChevron />
        <span>Dettagli tecnici</span>
      </summary>
      <pre className="gestionale-scrollbar max-h-32 overflow-auto border-t border-[color:var(--cab-border)] px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[color:var(--cab-text)]">
        {detail}
      </pre>
    </details>
  );
}

function QuickNavLinks() {
  const { links, ready } = useAccessibleQuickNavLinks({ max: 3 });

  if (!ready || links.length === 0) return null;

  return (
    <div className="mt-4 border-t border-[color:var(--cab-border)] pt-4">
      <p className="text-xs font-medium text-[color:var(--cab-text-muted)]">Collegamenti rapidi</p>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`text-sm font-medium text-[color:var(--cab-primary)] underline-offset-2 hover:underline ${dsFocus}`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ErrorCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  technicalDetail?: string;
  onRetry?: () => void;
  onBack?: () => void;
  safeExitHref: string;
  safeExitLabel: string;
  safeExitReady: boolean;
  showQuickNav?: boolean;
};

function ErrorCard({
  eyebrow,
  title,
  description,
  technicalDetail,
  onRetry,
  onBack,
  safeExitHref,
  safeExitLabel,
  safeExitReady,
  showQuickNav = false,
}: ErrorCardProps) {
  return (
    <div
      className={`${authStandaloneCardClass} max-w-md border-[color:color-mix(in_srgb,var(--cab-danger)_16%,var(--cab-border))]`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <ErrorWarningIcon />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--cab-text-muted)]">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-base font-semibold tracking-tight text-[color:var(--cab-text)] sm:text-lg">
            {title}
          </h1>
        </div>
      </div>

      <p className={`${dsTypoSmall} mt-3 leading-relaxed text-[color:var(--cab-text-muted)]`}>{description}</p>

      {technicalDetail ? <TechnicalDetails detail={technicalDetail} /> : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`text-sm font-medium text-[color:var(--cab-text-muted)] underline-offset-2 hover:text-[color:var(--cab-text)] hover:underline sm:order-1 ${dsFocus}`}
          >
            Indietro
          </button>
        ) : (
          <span className="hidden sm:block sm:order-1" aria-hidden />
        )}

        <div className="flex flex-col gap-2 sm:order-2 sm:flex-row sm:items-center">
          {safeExitReady ? (
            <Link
              href={safeExitHref}
              className={`${onRetry ? dsBtnNeutral : dsBtnPrimary} inline-flex justify-center no-underline`}
              aria-label={safeExitLabel}
            >
              {safeExitLabel}
            </Link>
          ) : (
            <button
              type="button"
              className={`${onRetry ? dsBtnNeutral : dsBtnPrimary}`}
              disabled
            >
              Caricamento…
            </button>
          )}
          {onRetry ? (
            <button type="button" className={dsBtnPrimary} onClick={() => onRetry()}>
              Riprova
            </button>
          ) : null}
        </div>
      </div>

      {showQuickNav ? <QuickNavLinks /> : null}
    </div>
  );
}

function GestionaleErrorCardBody({
  description,
  technicalDetail,
  onRetry,
}: {
  description: string;
  technicalDetail?: string;
  onRetry?: () => void;
}) {
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
    <ErrorCard
      eyebrow="Errore di caricamento"
      title="Impossibile caricare la pagina"
      description={description}
      technicalDetail={technicalDetail}
      onRetry={onRetry}
      onBack={goBack}
      safeExitHref={safeHome.href}
      safeExitLabel={safeHome.label}
      safeExitReady={safeHome.ready}
      showQuickNav
    />
  );
}

export function GestionaleErrorFallback({
  variant,
  message,
  digest,
  onRetry,
}: GestionaleErrorFallbackProps) {
  const raw = message?.trim();
  const description = friendlyDescription(variant, raw);
  const technicalDetail = buildTechnicalDetail(raw, digest);

  if (variant === "gestionale") {
    return (
      <div className="flex min-h-[min(28rem,60vh)] min-w-0 flex-col items-center justify-center px-2 py-8 sm:py-12">
        <GestionaleErrorCardBody
          description={description}
          technicalDetail={technicalDetail}
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (variant === "global") {
    return (
      <div className="flex min-h-[var(--cab-app-height,100dvh)] min-w-0 flex-col items-center justify-center px-4 py-12">
        <ErrorCard
          eyebrow="Errore di caricamento"
          title="Impossibile caricare l'applicazione"
          description={description}
          technicalDetail={technicalDetail}
          onRetry={onRetry}
          safeExitHref="/"
          safeExitLabel="Torna alla home"
          safeExitReady
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] min-w-0 flex-col items-center justify-center px-4 py-12">
      <ErrorCard
        eyebrow="Errore imprevisto"
        title="Qualcosa è andato storto"
        description={description}
        technicalDetail={technicalDetail}
        onRetry={onRetry}
        safeExitHref="/"
        safeExitLabel="Torna alla home"
        safeExitReady
      />
    </div>
  );
}
