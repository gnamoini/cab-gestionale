"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CabLogo } from "@/components/gestionale/cab-logo";
import { authStandaloneCardClass } from "@/components/gestionale/auth-standalone-page";
import { dsBtnNeutral, dsBtnPrimary, dsFocus } from "@/lib/ui/design-system";

function TechnicalDetails({ detail }: { detail: string }) {
  return (
    <details className="mt-4 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border)_88%,transparent)]">
      <summary
        className={`cursor-pointer list-none px-3 py-2 text-xs text-[color:var(--cab-text-muted)] transition-colors hover:text-[color:var(--cab-text)] [&::-webkit-details-marker]:hidden ${dsFocus}`}
      >
        Dettagli
      </summary>
      <pre className="gestionale-scrollbar max-h-32 overflow-auto border-t border-[color:var(--cab-border)] px-3 py-2 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words text-[color:var(--cab-text-muted)]">
        {detail}
      </pre>
    </details>
  );
}

export type ErrorPageCardProps = {
  eyebrow?: string;
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
    <div className={`${authStandaloneCardClass} text-center`} role="alert" aria-live="assertive">
      {showLogo ? (
        <div className="flex justify-center">
          <CabLogo
            height={40}
            priority
            className="object-center dark:brightness-[1.08] dark:contrast-[0.95]"
          />
        </div>
      ) : null}

      {eyebrow ? <p className="sr-only">{eyebrow}</p> : null}

      <h1 className={`text-base font-semibold tracking-tight text-[color:var(--cab-text)] ${showLogo ? "mt-5" : ""}`}>
        {title}
      </h1>

      <p className="mt-2 text-sm leading-relaxed text-[color:var(--cab-text-muted)]">{description}</p>

      {technicalDetail ? <TechnicalDetails detail={technicalDetail} /> : null}

      <div className="mt-6 flex flex-col-reverse items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        {safeExitReady ? (
          <Link
            href={safeExitHref}
            className={`${dsBtnNeutral} inline-flex min-h-10 items-center justify-center px-5 text-sm font-medium no-underline sm:min-w-[7.5rem]`}
            aria-label={safeExitLabel}
          >
            {safeExitLabel}
          </Link>
        ) : (
          <button
            type="button"
            className={`${dsBtnNeutral} min-h-10 px-5 text-sm font-medium sm:min-w-[7.5rem]`}
            disabled
          >
            Caricamento…
          </button>
        )}
        {onRetry ? (
          <button
            type="button"
            className={`${dsBtnPrimary} min-h-10 px-5 text-sm font-semibold sm:min-w-[7.5rem]`}
            onClick={() => onRetry()}
          >
            Riprova
          </button>
        ) : null}
      </div>

      {onBack ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={onBack}
            className={`text-sm font-medium text-[color:var(--cab-text-muted)] underline-offset-2 hover:text-[color:var(--cab-text)] hover:underline ${dsFocus}`}
          >
            Indietro
          </button>
        </div>
      ) : null}

      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}
