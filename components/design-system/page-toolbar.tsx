"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import {
  ToolbarGroup,
  ToolbarGroupBody,
  ToolbarGroupFiltersCollapse,
  ToolbarGroupFiltersToggle,
  ToolbarGroupMetaRow,
  ToolbarGroupOverflowToggle,
  ToolbarGroupPrimaryRow,
  ToolbarGroupSearchRow,
} from "@/components/design-system/toolbar-group";
import { MobileFilterDrawer } from "@/components/gestionale/mobile-filter-drawer";
import { dsPageToolbarMetaActionBtn, dsPageToolbarMetaActionBtnFilterCol, dsPageToolbarMetaChip, dsPageToolbarMetaChipAccent } from "@/lib/ui/design-system";
import { useSmUp } from "@/lib/ui/use-sm-up";

export type PageToolbarProps = {
  /** CTA principale; se assente, filtri affiancati alla search (nessuna riga vuota). */
  primaryAction?: ReactNode | null;
  search: ReactNode;
  filtersPanel: ReactNode;
  filtersExpanded: boolean;
  onFiltersToggle: () => void;
  filtersActive?: boolean;
  meta?: ReactNode;
  /** Azioni secondarie (reset, sort, toggle) — drawer «Altro» su mobile, inline da sm+. */
  overflowActions?: ReactNode;
  overflowOpen?: boolean;
  onOverflowToggle?: () => void;
  filterDrawerTitle?: string;
  onFilterReset?: () => void;
  onFilterApply?: () => void;
  filterApplyLabel?: string;
  className?: string;
  /** Marker benchmark TTUI — es. page-ready-toolbar */
  testId?: string;
};

/** Toolbar liste: search + filtri + azioni inline; scorre col contenuto pagina. */
export function PageToolbar({
  primaryAction,
  search,
  filtersPanel,
  filtersExpanded,
  onFiltersToggle,
  filtersActive,
  meta,
  overflowActions,
  overflowOpen = false,
  onOverflowToggle,
  filterDrawerTitle = "Filtri",
  onFilterReset,
  onFilterApply,
  filterApplyLabel,
  className = "",
  testId,
}: PageToolbarProps) {
  const smUp = useSmUp();
  const showFilterDrawer = !smUp && filtersExpanded;
  const showOverflowDrawer = !smUp && overflowOpen && Boolean(overflowActions);

  const closeFilterDrawer = useCallback(() => {
    if (filtersExpanded) onFiltersToggle();
  }, [filtersExpanded, onFiltersToggle]);

  const closeOverflowDrawer = useCallback(() => {
    onOverflowToggle?.();
  }, [onOverflowToggle]);

  useEffect(() => {
    if (smUp && overflowOpen) onOverflowToggle?.();
  }, [smUp, overflowOpen, onOverflowToggle]);

  const hasOverflow = Boolean(overflowActions) && Boolean(onOverflowToggle);
  const hasPrimaryAction = primaryAction != null && primaryAction !== false;

  const filterActions = (
    <div className="flex shrink-0 flex-nowrap items-center gap-2">
      <ToolbarGroupFiltersToggle
        expanded={filtersExpanded}
        onToggle={onFiltersToggle}
        filtersActive={filtersActive}
      />
      {hasOverflow ? (
        <ToolbarGroupOverflowToggle expanded={overflowOpen} onToggle={onOverflowToggle!} />
      ) : null}
    </div>
  );

  return (
    <>
      <ToolbarGroup className={className} testId={testId}>
        <ToolbarGroupBody>
          {hasPrimaryAction ? (
            <>
              <div className="flex min-w-0 w-full flex-col items-stretch gap-2 sm:hidden">
                <ToolbarGroupSearchRow>{search}</ToolbarGroupSearchRow>
                <ToolbarGroupPrimaryRow>
                  <div className="min-w-0 flex-1 [&>*]:w-full">{primaryAction}</div>
                  {filterActions}
                </ToolbarGroupPrimaryRow>
              </div>
              <div className="hidden min-w-0 w-full sm:flex">
                <ToolbarGroupPrimaryRow className="min-w-0 w-full sm:flex-nowrap sm:justify-start">
                  <div className="shrink-0">{primaryAction}</div>
                  <div className="min-w-0 flex-1">{search}</div>
                  {filterActions}
                </ToolbarGroupPrimaryRow>
              </div>
            </>
          ) : (
            <div className="flex-safe-row min-w-0 w-full flex-row flex-nowrap items-stretch gap-2">
              <div className="flex-safe-item min-w-0 flex-1">{search}</div>
              {filterActions}
            </div>
          )}
          {meta || overflowActions ? (
            <ToolbarGroupMetaRow>
              {meta ? <div className="flex min-w-0 flex-1 items-center gap-2">{meta}</div> : null}
              {overflowActions ? (
                <div className="hidden min-w-0 shrink-0 flex-nowrap items-center justify-end gap-2 sm:flex sm:flex-wrap">
                  {overflowActions}
                </div>
              ) : null}
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
          onApply={onFilterApply}
          applyLabel={filterApplyLabel}
        >
          {filtersPanel}
        </MobileFilterDrawer>
      ) : null}

      {showOverflowDrawer && onOverflowToggle ? (
        <MobileFilterDrawer
          open
          onClose={closeOverflowDrawer}
          title="Altro"
          applyLabel="Chiudi"
          onApply={closeOverflowDrawer}
          closeOnBodyButtonClick
        >
          {meta ? <div className="mb-3 min-w-0 border-b border-[color:var(--cab-border)] pb-3">{meta}</div> : null}
          <div className="flex flex-col gap-2">{overflowActions}</div>
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
  className = "",
}: {
  count: number;
  filtersActive?: boolean;
  searchActive?: boolean;
  onFilterReset?: () => void;
  onSearchReset?: () => void;
  singularLabel?: string;
  pluralLabel?: string;
  className?: string;
}) {
  const showSearchReset = Boolean(searchActive && onSearchReset);
  const showFilterReset = Boolean(filtersActive && onFilterReset);

  return (
    <div
      className={`flex min-w-0 flex-1 flex-nowrap items-center gap-x-1.5 gap-y-1 sm:flex-wrap ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 sm:flex-wrap">
        <span className={dsPageToolbarMetaChip}>
          <span className="tabular-nums">{count}</span>
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

/** Toggle meta toolbar (label + switch) — es. modalità modifica magazzino. */
export function PageToolbarMetaToggle({
  label,
  shortLabel,
  checked,
  onChange,
  title,
  className = "",
}: {
  label: string;
  shortLabel?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
  className?: string;
}) {
  const shell = checked
    ? `${dsPageToolbarMetaActionBtn} border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_24%,transparent)]`
    : dsPageToolbarMetaActionBtn;

  return (
    // ui-contract-disable-next-line native-title-tooltip: toolbar switch uses title for compact touch hint
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      onClick={() => onChange(!checked)}
      className={`${shell} max-w-full justify-start gap-2 ${className}`.trim()}
    >
      <span className="min-w-0 shrink truncate text-left whitespace-nowrap">
        <span className="sm:hidden">{shortLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      <span
        aria-hidden
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked
            ? "bg-[color:var(--cab-primary)]"
            : "bg-[color:color-mix(in_srgb,var(--cab-border)_80%,var(--cab-surface))]"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

/** @deprecated Preferire prop `overflowActions` su PageToolbar. Wrapper inline desktop-only. */
export function PageToolbarActions({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 max-w-full shrink-0 flex-nowrap items-center gap-2 sm:flex-wrap sm:justify-end">{children}</div>;
}

/** Pulsanti overflow full-width nel drawer mobile. */
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
