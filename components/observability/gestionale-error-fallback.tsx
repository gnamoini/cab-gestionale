"use client";

import Link from "next/link";
import { authStandaloneCardClass } from "@/components/gestionale/auth-standalone-page";
import { useSafeGestionaleHomeLink } from "@/components/observability/use-safe-gestionale-home-link";
import {
  dsBtnNeutral,
  dsBtnPrimary,
  dsFocus,
  dsTypoSmall,
} from "@/lib/ui/design-system";

export type GestionaleErrorFallbackProps = {
  variant: "root" | "gestionale";
  message?: string;
  onRetry?: () => void;
};

function isTechnicalMessage(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  if (t.includes(" is not defined")) return true;
  if (t.startsWith("Cannot ") || t.startsWith("Failed to ")) return true;
  if (/^(Type|Reference|Syntax)Error:/i.test(t)) return true;
  return t.length > 120;
}

function friendlyDescription(variant: GestionaleErrorFallbackProps["variant"], raw?: string): string {
  const trimmed = raw?.trim();
  if (trimmed && !isTechnicalMessage(trimmed)) return trimmed;
  return variant === "gestionale"
    ? "Si è verificato un problema temporaneo. Riprova o torna al menu."
    : "Si è verificato un problema temporaneo. Riprova tra qualche istante.";
}

function ErrorCard({
  title,
  description,
  technicalDetail,
  onRetry,
  safeExitHref,
  safeExitLabel,
  safeExitReady,
}: {
  title: string;
  description: string;
  technicalDetail?: string;
  onRetry?: () => void;
  safeExitHref: string;
  safeExitLabel: string;
  safeExitReady: boolean;
}) {
  return (
    <div
      className={`${authStandaloneCardClass} max-w-md border-[color:color-mix(in_srgb,var(--cab-danger)_16%,var(--cab-border))]`}
      role="alert"
      aria-live="assertive"
    >
      <h1 className="text-base font-semibold tracking-tight text-[color:var(--cab-text)] sm:text-lg">
        {title}
      </h1>
      <p className={`${dsTypoSmall} mt-2 leading-relaxed text-[color:var(--cab-text-muted)]`}>{description}</p>

      {technicalDetail ? (
        <details className="group mt-4 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))]">
          <summary
            className={`flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-[color:var(--cab-text-muted)] transition-colors hover:text-[color:var(--cab-text)] [&::-webkit-details-marker]:hidden ${dsFocus}`}
          >
            <span className="transition-transform duration-200 group-open:rotate-90" aria-hidden>
              ›
            </span>
            <span>Dettagli</span>
          </summary>
          <pre className="gestionale-scrollbar max-h-32 overflow-auto border-t border-[color:var(--cab-border)] px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-[color:var(--cab-text)]">
            {technicalDetail}
          </pre>
        </details>
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        {onRetry ? (
          <button type="button" className={`${dsBtnPrimary} w-full`} onClick={() => onRetry()}>
            Riprova
          </button>
        ) : null}
        {safeExitReady ? (
          <Link
            href={safeExitHref}
            className={`${onRetry ? dsBtnNeutral : dsBtnPrimary} inline-flex w-full justify-center no-underline`}
            aria-label={safeExitLabel}
          >
            <span className="text-center">{safeExitLabel}</span>
          </Link>
        ) : (
          <button type="button" className={`${onRetry ? dsBtnNeutral : dsBtnPrimary} w-full`} disabled>
            Caricamento…
          </button>
        )}
      </div>
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
  const safeHome = useSafeGestionaleHomeLink();

  return (
    <ErrorCard
      title="Impossibile caricare la pagina"
      description={description}
      technicalDetail={technicalDetail}
      onRetry={onRetry}
      safeExitHref={safeHome.href}
      safeExitLabel={safeHome.label}
      safeExitReady={safeHome.ready}
    />
  );
}

export function GestionaleErrorFallback({ variant, message, onRetry }: GestionaleErrorFallbackProps) {
  const raw = message?.trim();
  const description = friendlyDescription(variant, raw);
  const technicalDetail = raw && isTechnicalMessage(raw) ? raw : undefined;

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

  return (
    <div className="flex min-h-[40vh] min-w-0 flex-col items-center justify-center px-4 py-12">
      <ErrorCard
        title="Errore imprevisto"
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
