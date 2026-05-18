"use client";

import type { ReactNode } from "react";
import { dsPageToolbarBtn, dsStickyToolbar } from "@/lib/ui/design-system";

function FiltersChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-[color:var(--cab-primary)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${expanded ? "rotate-180" : ""}`}
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

export type PageToolbarProps = {
  primaryAction: ReactNode;
  search: ReactNode;
  filtersPanel: ReactNode;
  filtersExpanded: boolean;
  onFiltersToggle: () => void;
  filtersActive?: boolean;
  meta?: ReactNode;
  className?: string;
};

export function PageToolbar({
  primaryAction,
  search,
  filtersPanel,
  filtersExpanded,
  onFiltersToggle,
  filtersActive,
  meta,
  className = "",
}: PageToolbarProps) {
  return (
    <div className={`${dsStickyToolbar} -mx-1 ${className}`.trim()}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {primaryAction}
          {search}
          <button
            type="button"
            onClick={onFiltersToggle}
            className={`${dsPageToolbarBtn} relative h-11 min-w-[8.25rem] shrink-0 gap-2 px-3 text-sm sm:ml-auto`}
            aria-expanded={filtersExpanded}
          >
            Filtri
            <FiltersChevron expanded={filtersExpanded} />
            {filtersActive ? (
              <span
                className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--cab-primary)] ring-2 ring-[var(--cab-surface)]"
                title="Filtri attivi"
                aria-hidden
              />
            ) : null}
          </button>
        </div>
        {meta ? (
          <div className="flex flex-col gap-2 border-t border-[color:var(--cab-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            {meta}
          </div>
        ) : null}
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          filtersExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[color:var(--cab-border)] pt-3" aria-label="Filtri">
            {filtersPanel}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageToolbarResultCount({
  count,
  filtersActive,
  singularLabel = "risultato",
  pluralLabel = "risultati",
}: {
  count: number;
  filtersActive?: boolean;
  singularLabel?: string;
  pluralLabel?: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="inline-flex items-baseline gap-1 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-surface)] px-2.5 py-1 text-xs text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)]">
        <span className="tabular-nums text-sm font-semibold text-[color:var(--cab-text)]">{count}</span>
        <span>{count === 1 ? singularLabel : pluralLabel}</span>
      </span>
      {filtersActive ? (
        <span className="rounded-md bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))]">
          Filtri attivi
        </span>
      ) : null}
    </div>
  );
}

export function PageToolbarActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 sm:justify-end">{children}</div>;
}
