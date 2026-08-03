"use client";

import { Tooltip } from "@/components/ui";
import type { ReactNode } from "react";
import { dsPageToolbar, dsPageToolbarFilterColWidth, dsPageToolbarIconBtn, dsPageToolbarIconBtnBoxed } from "@/lib/ui/design-system";

/**
 * ToolbarGroup — shell strutturale liste gestionale (search + filtri + azioni).
 *
 * Regole (invarianti UX):
 * - Search/filtri/state: contenuto e logica restano nelle view (ReactNode pass-through).
 * - Posizionamento: shell nel flusso pagina (scorre col contenuto); vietato sticky/fixed su shell e slot interni.
 * - Azioni modulo (undo, log, stampa, kanban, giacenza): restano in PageHeader, non qui.
 * - Mobile (< sm): search full-width; sotto CTA + filtri + overflow; meta compatta sotto con conteggio e reset (wrap).
 * - Desktop (sm+) con CTA: una riga CTA | search | filtri; meta sotto.
 * - Desktop (sm+) senza CTA: search | filtri sulla stessa riga; meta sotto.
 */

export type ToolbarGroupProps = {
  children: ReactNode;
  className?: string;
  testId?: string;
};

export function ToolbarGroup({ children, className = "", testId }: ToolbarGroupProps) {
  return (
    <div
      className={`${dsPageToolbar} min-w-0 w-full max-w-full ${className}`.trim()}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

/** Search: full-width prima riga mobile; in riga unica desktop quando c’è CTA (via PageToolbar). */
export function ToolbarGroupSearchRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex-safe-row min-w-0 w-full flex-row flex-nowrap items-stretch gap-2 ${className}`.trim()}>
      <div className="flex-safe-item min-w-0 w-full">{children}</div>
    </div>
  );
}

/** CTA + toggle filtri + overflow; seconda riga mobile; riga unica CTA | search | filtri da sm+ (PageToolbar). */
export function ToolbarGroupPrimaryRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex-safe-row min-w-0 w-full flex-row flex-nowrap items-stretch gap-2 sm:justify-between sm:gap-2 sm:flex-wrap ${className}`.trim()}
    >
      {children}
    </div>
  );
}

function FiltersChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`hidden h-4 w-4 shrink-0 text-[color:var(--cab-primary)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:inline ${expanded ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function FiltersFunnelIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v1a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 5.707A1 1 0 013 5V4z"
      />
    </svg>
  );
}

export function ToolbarGroupFiltersToggle({
  expanded,
  onToggle,
  filtersActive,
}: {
  expanded: boolean;
  onToggle: () => void;
  filtersActive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`${dsPageToolbarIconBtnBoxed} relative ${dsPageToolbarFilterColWidth} sm:w-auto sm:gap-2 sm:px-3 sm:py-0 sm:text-sm`}
      aria-expanded={expanded}
      aria-label="Filtri"
    >
      <FiltersFunnelIcon />
      <span className="hidden sm:inline">Filtri</span>
      <FiltersChevron expanded={expanded} />
      {filtersActive ? (
        <Tooltip content={"Filtri attivi"}><span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[color:var(--cab-primary)] ring-2 ring-[var(--cab-surface)]" aria-hidden/></Tooltip>
      ) : null}
    </button>
  );
}

/** Toggle menu overflow utility (mobile, icona nella riga compatta). */
export function ToolbarGroupOverflowToggle({
  expanded,
  onToggle,
  label = "Altro",
  className = "",
}: {
  expanded: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`${dsPageToolbarIconBtn} sm:hidden ${className}`.trim()}
      aria-expanded={expanded}
      aria-label={label}
    >
      <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <circle cx="5" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="12" r="2" />
      </svg>
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** Riga meta: conteggio + reset rapidi (+ overflow inline da sm+). */
export function ToolbarGroupMetaRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex-safe-row min-w-0 max-w-full shrink-0 flex-row flex-wrap items-center justify-between gap-2 border-t border-[color:var(--cab-border)] pt-2 [&>*]:min-w-0 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

/** Riga utility opzionale (pagine future); non usata dalle liste attuali per evitare shift layout. */
export function ToolbarGroupUtilityRow({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex-safe-row min-w-0 max-w-full flex-col gap-2 border-t border-[color:var(--cab-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 [&>*]:min-w-0"
    >
      {children}
    </div>
  );
}

/** Pannello filtri collapsible (grid-rows animation) — solo desktop (sm+). */
export function ToolbarGroupFiltersCollapse({
  expanded,
  children,
  ariaLabel = "Filtri",
}: {
  expanded: boolean;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div
      className={`hidden min-w-0 max-w-full transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:grid ${
        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="border-t border-[color:var(--cab-border)] pt-3 min-w-0 max-w-full" aria-label={ariaLabel}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Stack verticale interno shell (primary + meta). */
export function ToolbarGroupBody({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 max-w-full flex-col gap-2">{children}</div>;
}
