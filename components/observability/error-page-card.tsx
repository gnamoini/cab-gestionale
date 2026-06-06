"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CabLogo } from "@/components/gestionale/cab-logo";
import { authStandaloneCardClass } from "@/components/gestionale/auth-standalone-page";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsFocus,
  dsTypoCaption,
  dsTypoSmall,
} from "@/lib/ui/design-system";

function ErrorWarningIcon() {
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--cab-danger)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-card))]"
      aria-hidden
    >
      <svg
        className="h-5 w-5 text-[color:color-mix(in_srgb,var(--cab-danger)_85%,var(--cab-text))]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </span>
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
    <details className="group mt-5 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))]">
      <summary
        className={`flex cursor-pointer list-none items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-[color:var(--cab-text-muted)] transition-colors hover:text-[color:var(--cab-text)] [&::-webkit-details-marker]:hidden ${dsFocus}`}
      >
        <DetailsChevron />
        <span>Dettagli tecnici</span>
      </summary>
      <pre className="gestionale-scrollbar max-h-36 overflow-auto border-t border-[color:var(--cab-border)] px-3 py-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[color:var(--cab-text)]">
        {detail}
      </pre>
    </details>
  );
}

export type ErrorPageCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  technicalDetail?: string;
  showLogo?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
  safeExitHref: string;
  safeExitLabel: string;
  safeExitReady?: boolean;
  footer?: ReactNode;
};

export function ErrorPageCard({
  eyebrow,
  title,
  description,
  technicalDetail,
  showLogo = true,
  onRetry,
  onBack,
  safeExitHref,
  safeExitLabel,
  safeExitReady = true,
  footer,
}: ErrorPageCardProps) {
  return (
    <div
      className={`${authStandaloneCardClass} max-w-[26rem] border-[color:color-mix(in_srgb,var(--cab-danger)_14%,var(--cab-border))]`}
      role="alert"
      aria-live="assertive"
    >
      {showLogo ? (
        <div className="flex justify-center">
          <CabLogo
            height={48}
            priority
            className="object-center dark:brightness-[1.08] dark:contrast-[0.95]"
          />
        </div>
      ) : null}

      <div className={`flex items-start gap-3 ${showLogo ? "mt-6" : ""}`}>
        <ErrorWarningIcon />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--cab-text-muted)]">
            {eyebrow}
          </p>
          <h1 className="mt-1.5 text-lg font-semibold tracking-tight text-[color:var(--cab-text)]">{title}</h1>
        </div>
      </div>

      <p className={`${dsTypoCaption} mt-4 leading-relaxed text-[color:var(--cab-text-muted)]`}>{description}</p>

      {technicalDetail ? <TechnicalDetails detail={technicalDetail} /> : null}

      <div className="mt-6 flex flex-col gap-2.5">
        {onRetry ? (
          <button type="button" className={`${dsBtnPrimary} min-h-11 w-full py-2.5 text-sm font-semibold`} onClick={() => onRetry()}>
            Riprova
          </button>
        ) : null}
        {safeExitReady ? (
          <Link
            href={safeExitHref}
            className={`${onRetry ? dsBtnNeutral : dsBtnPrimary} inline-flex min-h-11 w-full justify-center py-2.5 text-sm font-semibold no-underline`}
            aria-label={safeExitLabel}
          >
            {safeExitLabel}
          </Link>
        ) : (
          <button type="button" className={`${dsBtnNeutral} min-h-11 w-full py-2.5 text-sm font-semibold`} disabled>
            Caricamento…
          </button>
        )}
      </div>

      {onBack ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onBack}
            className={`text-sm font-medium text-[color:var(--cab-text-muted)] underline-offset-2 hover:text-[color:var(--cab-text)] hover:underline ${dsFocus}`}
          >
            Indietro
          </button>
        </div>
      ) : null}

      {footer ? <div className="mt-5 border-t border-[color:var(--cab-border)] pt-4">{footer}</div> : null}

      <p className={`${dsTypoSmall} mt-5 text-center text-[color:var(--cab-text-muted)]`}>
        Se il problema persiste, ricarica la pagina o contatta l&apos;amministratore.
      </p>
    </div>
  );
}
