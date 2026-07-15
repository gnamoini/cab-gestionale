"use client";

import { useCallback, type ReactNode } from "react";
import {
  ToolbarGroup,
  ToolbarGroupBody,
  ToolbarGroupFiltersCollapse,
  ToolbarGroupMetaRow,
  ToolbarGroupSearchRow,
} from "@/components/design-system/toolbar-group";
import { MobileFilterDrawer } from "@/components/gestionale/mobile-filter-drawer";
import { dsPageToolbarMetaActionBtnFilterCol, dsPageToolbarMetaChip, dsPageToolbarMetaChipAccent } from "@/lib/ui/design-system";
import { useSmUp } from "@/lib/ui/use-sm-up";

export type PageToolbarProps = {
  search: ReactNode;
  filtersPanel: ReactNode;
  filtersExpanded: boolean;
  /** @deprecated Filtri si aprono da PageActionMenu. Mantenuto per compatibilità drawer mobile. */
  onFiltersToggle?: () => void;
  filtersActive?: boolean;
  meta?: ReactNode;
  filterDrawerTitle?: string;
  onFilterReset?: () => void;
  onFilterApply?: () => void;
  filterApplyLabel?: string;
  className?: string;
};

/** Toolbar liste slim: search + filtri collapsible + meta. Azioni in PageActionMenu. */
export function PageToolbar({
  search,
  filtersPanel,
  filtersExpanded,
  onFiltersToggle,
  filtersActive,
  meta,
  filterDrawerTitle = "Filtri",
  onFilterReset,
  onFilterApply,
  filterApplyLabel,
  className = "",
}: PageToolbarProps) {
  const smUp = useSmUp();
  const showFilterDrawer = !smUp && filtersExpanded;

  const closeFilterDrawer = useCallback(() => {
    onFiltersToggle?.();
  }, [onFiltersToggle]);

  return (
    <>
      <ToolbarGroup className={className}>
        <ToolbarGroupBody>
          <ToolbarGroupSearchRow>
            <div className="min-w-0 w-full flex-1">{search}</div>
          </ToolbarGroupSearchRow>
          {meta ? (
            <ToolbarGroupMetaRow>
              <div className="flex min-w-0 flex-1 items-center gap-2">{meta}</div>
            </ToolbarGroupMetaRow>
          ) : null}
        </ToolbarGroupBody>

        <ToolbarGroupFiltersCollapse expanded={filtersExpanded && smUp}>{filtersPanel}</ToolbarGroupFiltersCollapse>
      </ToolbarGroup>

      {showFilterDrawer ? (
        <MobileFilterDrawer
          open
          onClose={closeFilterDrawer}
          title={filterDrawerTitle}
          onReset={onFilterReset}
          onApply={onFilterApply ?? closeFilterDrawer}
          applyLabel={filterApplyLabel ?? "Chiudi"}
        >
          {filtersPanel}
        </MobileFilterDrawer>
      ) : null}
    </>
  );
}

/** Etichetta CTA toolbar: breve su mobile, completa da sm+. */
const pageToolbarCtaPlusIconClass = "h-[1.125rem] w-[1.125rem] shrink-0";

function PageToolbarPlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      className={`${pageToolbarCtaPlusIconClass} block`}
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function splitPlusShortLabel(short: string): { hasPlus: boolean; label: string } {
  if (short.startsWith("+ ")) return { hasPlus: true, label: short.slice(2) };
  if (short.startsWith("+")) return { hasPlus: true, label: short.slice(1).trimStart() };
  return { hasPlus: false, label: short };
}

export function PageToolbarCtaLabel({ short, full }: { short: string; full: string }) {
  const mobile = splitPlusShortLabel(short);
  return (
    <>
      <span className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 leading-none sm:hidden">
        {mobile.hasPlus ? <PageToolbarPlusIcon /> : null}
        <span className="min-w-0 truncate">{mobile.label}</span>
      </span>
      <span className="hidden sm:inline">{full}</span>
    </>
  );
}

export function PageToolbarResultCount({
  count,
  filtersActive,
  searchActive,
  onFilterReset,
  onSearchReset,
  singularLabel = "risultato",
  pluralLabel = "risultati",
}: {
  count: number;
  filtersActive?: boolean;
  searchActive?: boolean;
  onFilterReset?: () => void;
  onSearchReset?: () => void;
  singularLabel?: string;
  pluralLabel?: string;
}) {
  const showSearchReset = Boolean(searchActive && onSearchReset);
  const showFilterReset = Boolean(filtersActive && onFilterReset);

  return (
    <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-x-1.5 gap-y-1 sm:flex-wrap">
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 sm:flex-wrap">
        <span className={dsPageToolbarMetaChip}>
          <span className="tabular-nums font-semibold text-[color:var(--cab-text)]">{count}</span>
          <span>{count === 1 ? singularLabel : pluralLabel}</span>
        </span>
        {filtersActive ? <span className={dsPageToolbarMetaChipAccent}>Filtri attivi</span> : null}
      </div>
      {showSearchReset || showFilterReset ? (
        <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-2 sm:ms-auto sm:flex-wrap">
          {showSearchReset ? (
            <button type="button" onClick={onSearchReset} className={dsPageToolbarMetaActionBtnFilterCol}>
              <PageToolbarCtaLabel short="Cancella" full="Cancella ricerca" />
            </button>
          ) : null}
          {showFilterReset ? (
            <button type="button" onClick={onFilterReset} className={dsPageToolbarMetaActionBtnFilterCol}>
              <PageToolbarCtaLabel short="Reimposta" full="Reimposta filtri" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Azioni migrate in PageActionMenu. */
export function PageToolbarActions({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 max-w-full shrink-0 flex-nowrap items-center gap-2 sm:flex-wrap sm:justify-end">{children}</div>;
}

/** @deprecated Overflow migrate in PageActionMenu. */
export function PageToolbarOverflowAction({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex w-full flex-col gap-2 sm:w-auto sm:flex-row ${className}`.trim()}>
      {children}
    </div>
  );
}
