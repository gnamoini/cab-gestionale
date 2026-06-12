"use client";

import type { SelectorDomain } from "@/lib/selector-core/selector-domain-policy";

const DOMAIN_HINTS: Partial<Record<SelectorDomain, string>> = {
  mezzi: "Prova targa, matricola o scuderia",
  addetti: "Prova nome o cognome addetto",
  lavorazioni: "Prova nome addetto o filtro",
  magazzino: "Prova codice o descrizione ricambio",
  schede: "Prova targa, matricola o scuderia",
  security: "Prova codice o ragione sociale",
  dipendenti: "Prova nome dipendente",
};

export type SelectorEmptyStateProps = {
  message?: string;
  domain?: SelectorDomain;
  contextualHint?: string;
  onResetSearch?: () => void;
  onClearFilters?: () => void;
  showClearFilters?: boolean;
  className?: string;
};

/**
 * Empty state v2 — §16 linee guida + behavior reset search.
 */
export function SelectorEmptyState({
  message = "Nessun risultato trovato",
  domain,
  contextualHint,
  onResetSearch,
  onClearFilters,
  showClearFilters = false,
  className = "",
}: SelectorEmptyStateProps) {
  const hint =
    contextualHint ??
    (domain ? DOMAIN_HINTS[domain] : undefined) ??
    "Prova a modificare i termini di ricerca";

  return (
    <div
      className={`flex min-w-0 flex-col items-center gap-2 px-3 py-4 text-center ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <svg
        className="h-8 w-8 shrink-0 text-[color:var(--cab-text-muted)] opacity-80"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
        />
      </svg>
      <p className="text-sm font-medium text-[color:var(--cab-text)]">{message}</p>
      <p className="text-xs text-[color:var(--cab-text-muted)]">{hint}</p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {onResetSearch ? (
          <button
            type="button"
            className="rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2.5 py-1 text-xs font-medium text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]"
            onClick={onResetSearch}
          >
            Reimposta ricerca
          </button>
        ) : null}
        {showClearFilters && onClearFilters ? (
          <button
            type="button"
            className="rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2.5 py-1 text-xs font-medium text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)]"
            onClick={onClearFilters}
          >
            Azzera filtri
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function resolveSelectorEmptyHint(domain?: SelectorDomain): string {
  if (domain && DOMAIN_HINTS[domain]) return DOMAIN_HINTS[domain]!;
  return "Prova a modificare i termini di ricerca";
}
