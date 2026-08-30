"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CabLogo } from "@/components/gestionale/cab-logo";
import { authStandaloneCardClass } from "@/components/gestionale/auth-standalone-page";
import { dsBtnPrimary, dsFocus } from "@/lib/ui/design-system";

function TechnicalDetailsPanel({ detail }: { detail: string }) {
  return (
    <pre className="gestionale-scrollbar mt-2 max-h-28 overflow-auto rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border)_88%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,transparent)] px-3 py-2 text-left font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words text-[color:var(--cab-text-muted)]">
      {detail}
    </pre>
  );
}

export type ErrorPageCardLayout = "standalone" | "embedded";

export type ErrorPageCardProps = {
  title: string;
  description: string;
  technicalDetail?: string;
  showLogo?: boolean;
  layout?: ErrorPageCardLayout;
  onRetry?: () => void;
  onBack?: () => void;
  safeExitHref: string;
  safeExitLabel: string;
  safeExitReady?: boolean;
  footer?: ReactNode;
};

function SecondaryLinks({
  onBack,
  technicalDetail,
  technicalOpen,
  onToggleTechnical,
  safeExitHref,
  safeExitLabel,
  safeExitReady,
}: {
  onBack?: () => void;
  technicalDetail?: string;
  technicalOpen: boolean;
  onToggleTechnical: () => void;
  safeExitHref: string;
  safeExitLabel: string;
  safeExitReady: boolean;
}) {
  const actionClass = `text-sm font-medium text-[color:var(--cab-text-muted)] underline-offset-2 transition-colors hover:text-[color:var(--cab-text)] hover:underline ${dsFocus}`;
  const showSafeExit = !technicalDetail && safeExitReady;
  const showSafeExitLoading = !technicalDetail && !safeExitReady;
  const showSecondary = Boolean(technicalDetail) || showSafeExit || showSafeExitLoading;

  if (!onBack && !showSecondary) return null;

  return (
    <div className="mt-3 min-w-0">
      <p className="flex min-w-0 items-center justify-center gap-x-2 gap-y-1 text-sm flex-nowrap sm:flex-wrap">
        {onBack ? (
          <button type="button" onClick={onBack} className={`select-none ${actionClass}`}>
            Indietro
          </button>
        ) : null}
        {onBack && showSecondary ? (
          <span className="text-[color:var(--cab-text-muted)]" aria-hidden>
            ·
          </span>
        ) : null}
        {technicalDetail ? (
          <button
            type="button"
            onClick={onToggleTechnical}
            aria-expanded={technicalOpen}
            aria-controls="error-technical-details"
            className={`select-none ${actionClass}`}
          >
            Dettagli
          </button>
        ) : showSafeExit ? (
          <Link href={safeExitHref} className={`${actionClass} no-underline hover:underline`} aria-label={safeExitLabel}>
            {safeExitLabel}
          </Link>
        ) : showSafeExitLoading ? (
          <span className="text-sm text-[color:var(--cab-text-muted)]">Caricamento menu…</span>
        ) : null}
      </p>
      {technicalDetail && technicalOpen ? (
        <div id="error-technical-details">
          <TechnicalDetailsPanel detail={technicalDetail} />
        </div>
      ) : null}
    </div>
  );
}

export function ErrorPageCard({
  title,
  description,
  technicalDetail,
  showLogo = true,
  layout = "standalone",
  onRetry,
  onBack,
  safeExitHref,
  safeExitLabel,
  safeExitReady = true,
  footer,
}: ErrorPageCardProps) {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const embedded = layout === "embedded";
  const cardClass = embedded
    ? "mx-auto w-full min-w-0 max-w-[24rem] shrink-0 rounded-[var(--ds-radius-xl)] border border-[color:color-mix(in_srgb,var(--cab-border)_70%,var(--cab-border-strong))] bg-[var(--cab-card)] p-5 shadow-[var(--cab-shadow-sm)] sm:p-6"
    : authStandaloneCardClass;

  return (
    <div className={`${cardClass} text-center`} role="alert" aria-live="assertive">
      {showLogo ? (
        <div className="flex min-w-0 justify-center">
          <CabLogo
            height={40}
            priority
            className="object-center dark:brightness-[1.08] dark:contrast-[0.95]"
          />
        </div>
      ) : null}

      <h1 className={`text-base font-semibold tracking-tight text-[color:var(--cab-text)] ${showLogo ? "mt-5" : ""}`}>
        {title}
      </h1>

      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[color:var(--cab-text-muted)]">{description}</p>

      {onRetry ? (
        <button
          type="button"
          className={`${dsBtnPrimary} mt-5 inline-flex min-h-10 w-full items-center justify-center px-5 text-sm font-semibold`}
          onClick={() => onRetry()}
        >
          Riprova
        </button>
      ) : null}

      <SecondaryLinks
        onBack={onBack}
        technicalDetail={technicalDetail}
        technicalOpen={technicalOpen}
        onToggleTechnical={() => setTechnicalOpen((open) => !open)}
        safeExitHref={safeExitHref}
        safeExitLabel={safeExitLabel}
        safeExitReady={safeExitReady}
      />

      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}
