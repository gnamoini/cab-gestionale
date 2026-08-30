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
import {
  dsFocus,
  dsPageToolbarMetaActionBtn,
  dsPageToolbarMetaActionBtnFilterCol,
  dsPageToolbarMetaChip,
  dsPageToolbarMetaChipAccent,
  dsPrimaryActiveSurface,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
} from "@/lib/ui/design-system";
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
  /** Mobile: griglia 3 colonne (CTA | CTA | filtri) con spaziatura uniforme. */
  mobilePrimaryThreeColumn?: boolean;
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
  mobilePrimaryThreeColumn = false,
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
                <ToolbarGroupPrimaryRow
                  className={mobilePrimaryThreeColumn ? "grid w-full grid-cols-3 items-stretch gap-2" : undefined}
                >
                  {mobilePrimaryThreeColumn ? (
                    <>
                      <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2">{primaryAction}</div>
                      <div className="flex min-w-0 items-stretch [&_button]:h-11 [&_button]:w-full">{filterActions}</div>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1 [&>*]:w-full">{primaryAction}</div>
                      {filterActions}
                    </>
                  )}
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
              {meta ? <div className="flex min-w-0 w-full flex-1 items-center gap-2 flex-nowrap sm:flex-wrap">{meta}</div> : null}
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
      className={`${pageToolbarCtaPlusIconClass} block min-w-0`}
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

export function PageToolbarCtaLabel({
  short,
  full,
  mobileNoTruncate = false,
}: {
  short: string;
  full: string;
  mobileNoTruncate?: boolean;
}) {
  const mobile = splitPlusShortLabel(short);
  return (
    <>
      <span className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 leading-none sm:hidden">
        {mobile.hasPlus ? <PageToolbarPlusIcon /> : null}
        <span className={mobileNoTruncate ? "shrink-0" : "min-w-0 truncate"}>{mobile.label}</span>
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
  tone = "chip",
  className = "",
  hideCountOnMobile = false,
  mobileUniformActions = false,
}: {
  count: number;
  filtersActive?: boolean;
  searchActive?: boolean;
  onFilterReset?: () => void;
  onSearchReset?: () => void;
  singularLabel?: string;
  pluralLabel?: string;
  /** `plain`: testo leggero senza chip — accanto a controlli segmentati. */
  tone?: "chip" | "plain";
  className?: string;
  /** Nasconde il chip conteggio sotto `sm` (es. magazzino mobile). */
  hideCountOnMobile?: boolean;
  /** Su mobile: status e azioni in griglia equidistante a larghezza piena. */
  mobileUniformActions?: boolean;
}) {
  const smUp = useSmUp();
  const showSearchReset = Boolean(searchActive && onSearchReset);
  const showFilterReset = Boolean(filtersActive && onFilterReset);
  const countLabel = count === 1 ? singularLabel : pluralLabel;
  const showCountChip = !hideCountOnMobile || smUp;
  const uniformMobile = mobileUniformActions && !smUp;
  const uniformCellClass = `${dsPageToolbarMetaActionBtn} w-full min-h-10 min-w-0 justify-center px-2`;
  const uniformStatusCellClass = `${dsPageToolbarMetaChipAccent} inline-flex w-full min-h-10 min-w-0 items-center justify-center px-2`;

  if (!showCountChip && !filtersActive && !showSearchReset && !showFilterReset) {
    return null;
  }

  if (uniformMobile) {
    const cells: ReactNode[] = [];

    if (showCountChip) {
      cells.push(
        <span key="count" className={`${uniformCellClass} pointer-events-none`}>
          <span className="tabular-nums">{count}</span>
          <span className="min-w-0 truncate">{countLabel}</span>
        </span>,
      );
    }
    if (filtersActive) {
      cells.push(
        <span key="filters" className={`${uniformStatusCellClass} pointer-events-none`} aria-live="polite">
          Filtri attivi
        </span>,
      );
    }
    if (showSearchReset) {
      cells.push(
        <button key="search" type="button" onClick={onSearchReset} className={uniformCellClass}>
          <PageToolbarCtaLabel short="Cancella" full="Cancella ricerca" />
        </button>,
      );
    }
    if (showFilterReset) {
      cells.push(
        <button key="filter" type="button" onClick={onFilterReset} className={uniformCellClass}>
          <PageToolbarCtaLabel short="Reimposta" full="Reimposta filtri" />
        </button>,
      );
    }

    if (cells.length === 0) return null;

    return (
      <div
        className={`grid w-full min-w-0 gap-2 ${className}`.trim()}
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
      >
        {cells}
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-nowrap items-center gap-1.5 sm:flex-wrap">
        {showCountChip ? (
          tone === "plain" ? (
            <span className="min-w-0 truncate text-xs font-medium text-[color:var(--cab-text-muted)]">
              <span className="tabular-nums font-semibold text-[color:var(--cab-text)]">{count}</span> {countLabel}
            </span>
          ) : (
            <span className={dsPageToolbarMetaChip}>
              <span className="tabular-nums">{count}</span>
              <span>{countLabel}</span>
            </span>
          )
        ) : null}
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

export type PageToolbarMetaSegmentOption = {
  id: string;
  label: string;
  shortLabel?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
};

/** Toggle meta toolbar come gruppo segmentato (es. Modifica + Etichette magazzino). */
export function PageToolbarMetaSegments({
  options,
  className = "",
}: {
  options: readonly PageToolbarMetaSegmentOption[];
  className?: string;
}) {
  if (options.length === 0) return null;

  return (
    <div className={`${dsSegmentedWrap} min-w-0 gap-0.5 p-0.5 ${className}`.trim()} role="group">
      {options.map((opt) => (
        // ui-contract-disable-next-line native-title-tooltip: segment uses title for compact touch hint
        <button
          key={opt.id}
          type="button"
          role="switch"
          aria-checked={opt.checked}
          title={opt.title}
          onClick={() => opt.onChange(!opt.checked)}
          className={`flex min-h-10 min-w-0 flex-1 items-center justify-center px-2.5 text-center text-xs font-semibold sm:min-h-9 sm:px-3 sm:text-sm ${
            opt.checked ? dsSegmentedBtnOn : dsSegmentedBtnOff
          } ${dsFocus}`}
        >
          <span className="truncate whitespace-nowrap sm:hidden">{opt.shortLabel ?? opt.label}</span>
          <span className="hidden truncate whitespace-nowrap sm:inline">{opt.label}</span>
        </button>
      ))}
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
    ? `${dsPageToolbarMetaActionBtn} ${dsPrimaryActiveSurface}`
    : dsPageToolbarMetaActionBtn;

  return (
    // ui-contract-disable-next-line native-title-tooltip: toolbar switch uses title for compact touch hint
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      onClick={() => onChange(!checked)}
      className={`${shell} max-w-full gap-2 ${className}`.trim()}
    >
      <span className="min-w-0 flex-1 truncate text-center whitespace-nowrap">
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
