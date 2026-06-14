"use client";

/**
 * SSOT UI Impostazioni — regole:
 * 1. Settings Page = PageHeader + griglia master-detail (area grid col.1 = altezza piena → sticky fino a fine scroll).
 *    Main panel pagina = SETTINGS_MAIN_PANEL (card sticky con stesso inset alto della sidebar).
 *    Overscroll fondo pagina: sentinel `dsGestionaleScrollEndPad` dentro il main panel (non in AppShell — evita scroll oltre la griglia che rompe sticky).
 * 2. Settings Section = header pagina (flat) o card (modal) + toolbar + SETTINGS_LIST_FRAME.
 * 3. Settings List Row = SETTINGS_LIST_ROW + IconActionButton + dsTableActionBtn* (view/edit o inline).
 * 4. Settings List Toolbar = SettingsListToolbar (Aggiungi + filtro, layout flat).
 * 5. Settings Warning = SETTINGS_WARNING_BANNER (token semantici, no colori raw).
 * 6. Settings Action (admin one-shot) = SETTINGS_ACTION_CARD separata da config operativa.
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { PageToolbarCtaLabel } from "@/components/design-system";
import { HubIconPlus } from "@/components/design-system/hub-table-action-icons";
import { IconActionButton } from "@/components/design-system/icon-action-button";
import { HubIconPencil, HubIconTrash } from "@/components/design-system/hub-table-action-icons";
import { GestionaleSearchField } from "@/components/gestionale/gestionale-search-field";
import { erpBtnNeutral } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  dsBtnPrimary,
  dsFocus,
  dsInput,
  dsPageToolbarCtaCompact,
  dsTableActionBtnDanger,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionGlyph,
  dsTypoSmall,
} from "@/lib/ui/design-system";
import { SETTINGS_LIST_INPUT_EDIT } from "@/lib/ui/settings-list-tokens";

/** Shell pannelli elenco impostazioni (clienti, gerarchie, …). */
export const SETTINGS_PANEL_SHELL =
  "w-full overflow-hidden rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]";

/** Wrapper pagina master-detail (modal legacy). */
export const SETTINGS_PAGE_SHELL =
  "relative flex min-h-0 w-full min-w-0 flex-col overflow-visible rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] shadow-[var(--cab-shadow-sm)]";

/** Shell pagina canonica `/impostazioni` — senza box esterno (PageHeader già inquadra). */
export const SETTINGS_PAGE_SHELL_PAGE = "relative flex min-h-0 w-full min-w-0 flex-col overflow-visible";

/** Griglia master-detail (modal legacy). Pagina canonica: `SETTINGS_PAGE_MASTER_ROW`. */
export const SETTINGS_PAGE_GRID =
  "grid min-h-0 items-start gap-x-5 gap-y-5 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-x-6 md:gap-y-6 lg:grid-cols-[16rem_minmax(0,1fr)]";

/** Master-detail pagina `/impostazioni` — grid: cella sidebar alta quanto il main (sticky fino a fine scroll). */
export const SETTINGS_PAGE_MASTER_ROW =
  "grid min-h-0 w-full min-w-0 grid-cols-1 items-start gap-5 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-x-6 md:gap-y-5 lg:grid-cols-[16rem_minmax(0,1fr)]";

/** PageHeader sopra master-detail — spazio sotto la linea del bordo prima della griglia. */
export const SETTINGS_PAGE_HEADER_WRAP =
  "mb-[length:var(--ds-space-lg)] min-w-0 max-w-full sm:mb-[length:var(--ds-space-xl)] [&>header]:mb-0";

/** Stack pagina `/impostazioni` — senza `overflow-x-clip` (rompe sticky sulla sidebar). */
export const SETTINGS_PAGE_STACK =
  "min-w-0 max-w-full space-y-[length:var(--ds-space-xl)] overflow-visible";

export const SETTINGS_PAGE_GRID_MODAL = "flex min-h-0 min-w-0 flex-1 overflow-hidden";

/** Altezza sidebar pagina — viewport meno top bar app e inset simmetrico alto/basso (`--cab-settings-sidebar-inset`). */
export const SETTINGS_SIDEBAR_VIEWPORT_HEIGHT = "var(--cab-settings-sidebar-height)";

/** Aside navigazione sezioni (desktop sticky in cella grid, scroll interno al menu). */
export const SETTINGS_SIDEBAR_SHELL =
  "hidden min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)] md:sticky md:top-[length:var(--cab-settings-sidebar-inset)] md:bottom-[length:var(--cab-settings-sidebar-inset)] md:z-[1] md:flex md:h-[var(--cab-settings-sidebar-height)] md:max-h-[var(--cab-settings-sidebar-height)] md:self-start";

export const SETTINGS_SIDEBAR_OVERVIEW =
  "shrink-0 border-b border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] p-2";

export const SETTINGS_SIDEBAR_NAV =
  "gestionale-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-pt-[length:var(--cab-settings-sidebar-inset)] scroll-pb-[length:var(--cab-settings-sidebar-inset)]";

/** Padding nav sidebar pagina — simmetrico all'inset sticky alto/basso. */
export const SETTINGS_SIDEBAR_NAV_PAGE_PAD =
  "px-2 pt-[length:var(--cab-settings-sidebar-inset)] pb-[length:var(--cab-settings-sidebar-inset)]";

export const SETTINGS_MAIN_PANEL =
  "min-w-0 max-w-full overflow-x-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)] p-3 sm:p-4 md:p-5 md:sticky md:top-[length:var(--cab-settings-sidebar-inset)] md:z-[1] md:self-start";

export const SETTINGS_MAIN_HEADER = "mb-4 min-w-0";

/** Titolo sezione attiva nel main panel Impostazioni (h2). */
export const SETTINGS_ACTIVE_SECTION_TITLE =
  "text-lg font-semibold tracking-tight text-[color:var(--cab-text)] md:text-xl";

export const SETTINGS_NAV_GROUP_LABEL = `${dsTypoSmall} mb-1 mt-3 truncate py-1.5 pl-2.5 pr-2 font-semibold uppercase tracking-wider text-[color:var(--cab-text-muted)] first:mt-0`;

export const SETTINGS_NAV_BTN =
  "relative flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-[background-color,box-shadow,color] duration-150 ease-out touch-manipulation [-webkit-tap-highlight-color:transparent]";

export const SETTINGS_NAV_BTN_LABEL = "min-w-0 flex-1 truncate leading-snug";

export const SETTINGS_NAV_ICON_WRAP =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-[background-color,color] duration-150";

export const SETTINGS_NAV_ICON_WRAP_ACTIVE =
  "bg-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-surface-2))] text-[color:var(--cab-primary)]";

export const SETTINGS_NAV_ICON_WRAP_IDLE =
  "bg-[color:color-mix(in_srgb,var(--cab-surface-2)_75%,var(--cab-card))] text-[color:var(--cab-text-muted)] group-hover:bg-[color:color-mix(in_srgb,var(--cab-surface-2)_95%,var(--cab-hover))] group-hover:text-[color:var(--cab-text)]";

export const SETTINGS_LIST_UL = "divide-y divide-[color:var(--cab-border)]";

/** Lista con separatore — dentro SETTINGS_LIST_FRAME (flat) o card (spaced). */
export const SETTINGS_LIST_DIVIDER_UL = "divide-y divide-[color:var(--cab-border)]";

export const SETTINGS_LIST_DIVIDER_UL_SPACED = "mt-3 divide-y divide-[color:var(--cab-border)]";

/** Contenuto sezione flat nel main panel (senza card annidata). */
export const SETTINGS_SECTION_BODY = "w-full min-w-0";

/** Card sezione interna (modal legacy o blocchi isolati). */
export const SETTINGS_SECTION_CARD = `${SETTINGS_PANEL_SHELL} p-3 sm:p-4`;

/** Frame elenco: bordo solo attorno alle righe (toolbar fuori). */
export const SETTINGS_LIST_FRAME =
  "mt-3 overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]";

/** Card azioni amministrative secondarie (migrazioni one-shot). */
export const SETTINGS_ACTION_CARD = `${SETTINGS_PANEL_SHELL} mt-4 border-dashed bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-3 sm:p-4`;

export const SETTINGS_SECTION_TITLE =
  "text-xs font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]";

export const SETTINGS_SECTION_HINT = "mt-1 text-xs text-[color:var(--cab-text-muted)]";

export const SETTINGS_SECTION_DESC = SETTINGS_SECTION_HINT;

export const SETTINGS_ADD_ROW = "mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center";

/** Toolbar elenco: tasto Aggiungi + filtro (senza box container). */
export const SETTINGS_LIST_TOOLBAR =
  "mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3";

export const SETTINGS_ADD_INPUT = `${dsInput} min-h-11 min-w-0 flex-1 text-sm ${dsFocus}`;

export const SETTINGS_EMPTY_STATE =
  "rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] px-4 py-8 text-center text-xs text-[color:var(--cab-text-muted)]";

export const SETTINGS_EMPTY_STATE_INLINE =
  "px-4 py-8 text-center text-xs text-[color:var(--cab-text-muted)]";

export const SETTINGS_WARNING_BANNER =
  "mt-3 rounded-lg border border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_12%,var(--cab-surface))] px-3 py-2 text-xs text-[color:color-mix(in_srgb,var(--cab-warning)_75%,var(--cab-text))]";

/** Etichetta nel chip sconto %. */
export const SETTINGS_DISCOUNT_LABEL =
  "flex h-full min-h-0 items-center self-stretch px-2.5 text-xs font-medium leading-none text-[color:var(--cab-text-muted)] whitespace-nowrap";

/** Pannello destro del chip — stesso fondo dell'etichetta; focus evidenziato dal contenitore. */
export const SETTINGS_DISCOUNT_VALUE_SHELL =
  "relative flex h-full min-h-0 min-w-[2.75rem] items-stretch self-stretch overflow-hidden rounded-r-[calc(var(--ds-radius-lg)-2px)] border-l border-[color:color-mix(in_srgb,var(--cab-border)_92%,var(--cab-border-strong))] transition-[background-color,box-shadow] duration-150";

/** Input numerico — allineato tipograficamente all'etichetta. */
export const SETTINGS_DISCOUNT_INPUT =
  "h-full min-h-0 w-full min-w-0 flex-1 border-0 bg-[var(--cab-surface)] px-1.5 text-center text-xs font-medium tabular-nums leading-none text-[color:var(--cab-text)] outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none touch-manipulation [-webkit-tap-highlight-color:transparent]";

/** Chip sconto % inline — stessa scatola di dsTableActionBtnSecondary (h-10 / h-9, rounded-lg, border-2). */
export const SETTINGS_DISCOUNT_FIELD =
  "inline-grid h-11 min-h-11 max-h-11 shrink-0 grid-cols-[auto_2.75rem] grid-rows-1 items-stretch overflow-hidden rounded-lg border-2 border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)] transition-[border-color,box-shadow] duration-150 focus-within:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--cab-primary)_16%,transparent)] focus-within:[&_[data-discount-value]]:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus-within:[&_[data-discount-value]]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_22%,transparent)] sm:h-9 sm:min-h-9 sm:max-h-9";

export function SettingsDiscountField({
  id,
  label,
  value,
  onChange,
  ariaLabel,
  min = 0,
  max = 100,
  step = 1,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label htmlFor={id} className={SETTINGS_DISCOUNT_FIELD}>
      <span className={SETTINGS_DISCOUNT_LABEL}>{label}</span>
      <span className={SETTINGS_DISCOUNT_VALUE_SHELL} data-discount-value>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={SETTINGS_DISCOUNT_INPUT}
          aria-label={ariaLabel}
        />
      </span>
    </label>
  );
}

export const SETTINGS_LIST_ROW =
  "group flex min-h-11 flex-wrap items-center gap-x-2 gap-y-2 bg-[var(--cab-card)] px-3 py-2 transition-[background-color] duration-150 ease-out hover:bg-[var(--cab-hover)] sm:flex-nowrap sm:gap-x-3 [-webkit-tap-highlight-color:transparent]";

export const SETTINGS_ROW_ACTIONS_GROUP = "flex shrink-0 items-stretch gap-1";

function SettingsIconCheck({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SettingsIconX({ className = dsTableActionGlyph }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export const SETTINGS_LIST_INPUT =
  "min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-xs font-medium text-[color:var(--cab-text)] outline-none transition-[border-color,background-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:bg-[var(--cab-surface)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_25%,transparent)]";

/** Riga campo singolo dentro SETTINGS_LIST_FRAME (parametri numerici, toggle, …). */
export const SETTINGS_FORM_FIELD_ROW =
  "flex min-w-0 cursor-pointer flex-col gap-3 px-3 py-3 touch-manipulation [-webkit-tap-highlight-color:transparent] sm:flex-row sm:items-stretch sm:justify-between sm:gap-6 sm:px-4 sm:py-3.5";

/** Input numerico compatto in form field row — hitbox touch 44px. */
export const SETTINGS_FORM_NUMERIC_INPUT = `${dsInput} min-h-11 w-full tabular-nums touch-manipulation ${dsFocus}`;

export { SETTINGS_LIST_INPUT_EDIT } from "@/lib/ui/settings-list-tokens";

/** Salva/conferma riga edit al pointerdown fuori dal contenitore (capture — prima del focus shift). */
export function useSettingsRowCommitOnPointerDownOutside(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onCommit: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: PointerEvent) => {
      const root = containerRef.current;
      if (!root) return;
      const target = event.target;
      if (target instanceof Node && root.contains(target)) return;
      onCommit();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [active, containerRef, onCommit]);
}

/** Pulsanti azione riga impostazioni (allineati a lavorazioni-settings-ui). */
export const SETTINGS_ROW_BTN_BASE =
  "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium min-h-11 touch-manipulation sm:min-h-9 sm:py-1";

export const SETTINGS_ROW_BTN_NEUTRAL = `${SETTINGS_ROW_BTN_BASE} ${erpBtnNeutral} border-transparent`;

export const SETTINGS_ROW_BTN_PRIMARY = `${SETTINGS_ROW_BTN_BASE} ${dsBtnPrimary}`;

export const SETTINGS_ROW_BTN_DANGER = `${SETTINGS_ROW_BTN_BASE} border-transparent text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))] hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-surface))] ${dsFocus}`;

export function settingsNavIconWrapClass(active: boolean): string {
  return `${SETTINGS_NAV_ICON_WRAP} ${active ? SETTINGS_NAV_ICON_WRAP_ACTIVE : SETTINGS_NAV_ICON_WRAP_IDLE}`;
}

export function settingsNavBtnClass(active: boolean): string {
  const base = `${SETTINGS_NAV_BTN} group ${dsFocus}`;
  return active
    ? `${base} bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] font-semibold text-[color:var(--cab-text)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_22%,transparent)] before:absolute before:left-0 before:top-1/2 before:h-7 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-[color:var(--cab-primary)] before:content-['']`
    : `${base} text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]`;
}

export function settingsNavOverviewBtnClass(active: boolean): string {
  return settingsNavBtnClass(active);
}

/** Tile cliccabile nella vista Panoramica impostazioni (nested dentro SETTINGS_MAIN_PANEL). */
export const SETTINGS_OVERVIEW_TILE =
  "group flex min-h-11 w-full flex-row items-center gap-3 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-3 py-2.5 text-left transition-all duration-200 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] hover:shadow-[var(--cab-shadow-md)] active:scale-[0.98]";

export const SETTINGS_OVERVIEW_TILE_ICON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] text-[color:var(--cab-text-muted)] transition-[border-color,color,background-color] duration-200 group-hover:border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] group-hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-card))] group-hover:text-[color:var(--cab-primary)]";

export const SETTINGS_OVERVIEW_TILE_LABEL =
  "min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-[color:var(--cab-text)] group-hover:text-[color:var(--cab-text)]";

export function SettingsSectionHeader({
  groupLabel,
  title,
  titleId,
  description,
  badge,
  level = "page",
}: {
  groupLabel?: string;
  title: string;
  titleId?: string;
  description?: string;
  badge?: ReactNode;
  /** page = h2 nel main panel; card = h3 in card interna */
  level?: "page" | "card";
}) {
  if (level === "card") {
    return (
      <header>
        <h3 className={SETTINGS_SECTION_TITLE}>{title}</h3>
        {description ? <p className={SETTINGS_SECTION_HINT}>{description}</p> : null}
      </header>
    );
  }

  return (
    <header className={SETTINGS_MAIN_HEADER}>
      {groupLabel ? (
        <p className={`${SETTINGS_NAV_GROUP_LABEL} px-0 md:hidden`}>{groupLabel}</p>
      ) : null}
      <h2 id={titleId} className={`${SETTINGS_ACTIVE_SECTION_TITLE} ${groupLabel ? "mt-0.5 md:mt-0" : ""}`}>
        {title}
      </h2>
      {description ? <p className={`${SETTINGS_SECTION_HINT} mt-1.5 max-w-2xl text-sm`}>{description}</p> : null}
      {badge ? <div className="mt-2">{badge}</div> : null}
    </header>
  );
}

export type SettingsSectionLayout = "flat" | "card";

export function resolveSettingsSectionShell(layout: SettingsSectionLayout): string {
  return layout === "card" ? SETTINGS_SECTION_CARD : SETTINGS_SECTION_BODY;
}

export function SettingsListSection({
  layout = "flat",
  title,
  description,
  children,
}: {
  layout?: SettingsSectionLayout;
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className={resolveSettingsSectionShell(layout)}>
      {layout === "card" && title ? (
        <SettingsSectionHeader level="card" title={title} description={description} />
      ) : null}
      {children}
    </div>
  );
}

export function SettingsListFrame({ children }: { children: ReactNode }) {
  return <div className={SETTINGS_LIST_FRAME}>{children}</div>;
}

export function SettingsListBody({
  layout = "flat",
  showList,
  empty,
  children,
}: {
  layout?: SettingsSectionLayout;
  showList: boolean;
  empty: ReactNode;
  children: ReactNode;
}) {
  const body = showList ? children : empty;
  if (layout === "flat") return <SettingsListFrame>{body}</SettingsListFrame>;
  return body;
}

export function SettingsEmptyState({ children, inline = false }: { children: ReactNode; inline?: boolean }) {
  return <p className={inline ? SETTINGS_EMPTY_STATE_INLINE : SETTINGS_EMPTY_STATE}>{children}</p>;
}

export function SettingsAddRow({
  value,
  onChange,
  onAdd,
  placeholder,
  inputAriaLabel,
  addLabel = "Aggiungi",
  addLabelShort = "Aggiungi",
  disabled,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
  inputAriaLabel: string;
  addLabel?: string;
  addLabelShort?: string;
  disabled?: boolean;
  className?: string;
}) {
  const trimmed = value.trim();
  const canAdd = !disabled && Boolean(trimmed);

  return (
    <div className={`${SETTINGS_ADD_ROW} ${className}`.trim()}>
      <input
        className={SETTINGS_ADD_INPUT}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-label={inputAriaLabel}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (canAdd) onAdd();
          }
        }}
      />
      <button
        type="button"
        className={`${dsPageToolbarCtaCompact} min-h-11 w-full shrink-0 sm:w-auto`}
        disabled={!canAdd}
        onClick={onAdd}
      >
        <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
        <PageToolbarCtaLabel short={addLabelShort} full={addLabel} />
      </button>
    </div>
  );
}

export function SettingsListToolbar({
  searchValue,
  onSearchChange,
  searchAriaLabel,
  searchPlaceholder = "Filtra elenco…",
  onStartAdd,
  addLabel = "Aggiungi",
  addLabelShort = "Aggiungi",
  addDisabled,
  showAddButton = true,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchAriaLabel: string;
  searchPlaceholder?: string;
  onStartAdd?: () => void;
  addLabel?: string;
  addLabelShort?: string;
  addDisabled?: boolean;
  showAddButton?: boolean;
}) {
  return (
    <div className={SETTINGS_LIST_TOOLBAR}>
      {showAddButton ? (
        <button
          type="button"
          className={`${dsPageToolbarCtaCompact} min-h-11 w-full shrink-0 sm:w-auto`}
          disabled={addDisabled}
          onClick={onStartAdd}
        >
          <HubIconPlus className="h-4 w-4 shrink-0" aria-hidden />
          <PageToolbarCtaLabel short={addLabelShort} full={addLabel} />
        </button>
      ) : null}
      <GestionaleSearchField
        wrapperClassName="mt-0 w-full min-h-11 min-w-0 flex-1 sm:self-center"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        autoComplete="off"
        aria-label={searchAriaLabel}
      />
    </div>
  );
}

export function SettingsRowActionButtons({
  mode,
  itemLabel,
  onEdit,
  onConfirm,
  onCancelEdit,
  onRemove,
  showRemoveInEdit = false,
  leading,
  className = "",
  removeTooltipContent,
}: {
  mode: "view" | "edit";
  itemLabel: string;
  onEdit: () => void;
  onConfirm: () => void;
  onCancelEdit: () => void;
  onRemove: () => void;
  showRemoveInEdit?: boolean;
  /** Contenuto opzionale a sinistra (es. campione colore) nello stesso gruppo azioni. */
  leading?: ReactNode;
  className?: string;
  /** Tooltip alternativo sul cestino (es. addetto già usato in lavorazioni). */
  removeTooltipContent?: string;
}) {
  const groupLabel = `Azioni per ${itemLabel}`;
  const groupClass = `${SETTINGS_ROW_ACTIONS_GROUP} ${className}`.trim();

  if (mode === "edit") {
    return (
      <div className={groupClass} role="group" aria-label={groupLabel}>
        {leading}
        <IconActionButton
          label={`Conferma modifica ${itemLabel}`}
          className={dsTableActionBtnPrimary}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onConfirm}
        >
          <SettingsIconCheck />
        </IconActionButton>
        <IconActionButton
          label={`Annulla modifica ${itemLabel}`}
          className={dsTableActionBtnSecondary}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCancelEdit}
        >
          <SettingsIconX />
        </IconActionButton>
        {showRemoveInEdit ? (
          <IconActionButton
            label={`Elimina ${itemLabel}`}
            tooltipContent={removeTooltipContent}
            className={dsTableActionBtnDanger}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onRemove}
          >
            <HubIconTrash className={dsTableActionGlyph} />
          </IconActionButton>
        ) : null}
      </div>
    );
  }

  return (
    <div className={groupClass} role="group" aria-label={groupLabel}>
      {leading}
      <IconActionButton
        label={`Modifica ${itemLabel}`}
        className={dsTableActionBtnSecondary}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onEdit}
      >
        <HubIconPencil className={dsTableActionGlyph} />
      </IconActionButton>
      <IconActionButton
        label={`Elimina ${itemLabel}`}
        tooltipContent={removeTooltipContent}
        className={dsTableActionBtnDanger}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRemove}
      >
        <HubIconTrash className={dsTableActionGlyph} />
      </IconActionButton>
    </div>
  );
}

/** Riga con campo sempre editabile (gerarchie, codici modello). */
export function SettingsInlineStringRow({
  value,
  onRenameBlur,
  onRemove,
  ariaLabel,
}: {
  value: string;
  onRenameBlur: (previous: string, next: string) => void;
  onRemove: () => void;
  ariaLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const next = inputRef.current?.value ?? value;
    onRenameBlur(value, next);
  };

  const cancel = () => {
    if (inputRef.current) inputRef.current.value = value;
  };

  return (
    <li className={`${SETTINGS_LIST_ROW} gap-2 py-2`}>
      <input
        ref={inputRef}
        className={`${dsInput} min-h-9 min-w-0 flex-1 py-1.5 text-sm`}
        defaultValue={value}
        key={`${value}-inline`}
        autoComplete="off"
        spellCheck={false}
        aria-label={ariaLabel ?? `Modifica ${value}`}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            commit();
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            cancel();
          }
        }}
      />
      <SettingsRowActionButtons
        mode="edit"
        itemLabel={value}
        showRemoveInEdit
        onEdit={() => {}}
        onConfirm={commit}
        onCancelEdit={cancel}
        onRemove={onRemove}
      />
    </li>
  );
}

/** Riga rapida: input + CTA (senza shell toolbar). */
export function SettingsQuickAddRow({
  placeholder,
  value,
  onChange,
  onAdd,
  addLabel,
  addLabelShort,
  inputAriaLabel,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  addLabel: string;
  addLabelShort: string;
  inputAriaLabel: string;
}) {
  return (
    <SettingsAddRow
      value={value}
      onChange={onChange}
      onAdd={onAdd}
      placeholder={placeholder}
      inputAriaLabel={inputAriaLabel}
      addLabel={addLabel}
      addLabelShort={addLabelShort}
    />
  );
}

export function SettingsEditableStringRow({
  value,
  onRenameBlur,
  onRemove,
  trailing,
  draft = false,
  placeholder,
  onDraftCancel,
  indent = false,
}: {
  value: string;
  onRenameBlur: (previous: string, next: string) => void;
  onRemove: () => void;
  trailing?: ReactNode;
  /** Riga bozza in cima all'elenco: edit immediato, conferma = creazione. */
  draft?: boolean;
  placeholder?: string;
  onDraftCancel?: () => void;
  /** Indentazione per righe figlie (es. modelli sotto una marca). */
  indent?: boolean;
}) {
  const [editing, setEditing] = useState(draft);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLLIElement>(null);
  const itemLabel = draft ? (placeholder?.trim() || "nuovo elemento") : value;

  const commitEdit = useCallback(() => {
    const next = inputRef.current?.value ?? value;
    if (draft) {
      const trimmed = next.trim();
      if (!trimmed) {
        onDraftCancel?.();
        return;
      }
      onRenameBlur("", trimmed);
      return;
    }
    setEditing(false);
    onRenameBlur(value, next);
  }, [draft, onDraftCancel, onRenameBlur, value]);

  const cancelEdit = useCallback(() => {
    if (draft) {
      onDraftCancel?.();
      return;
    }
    setEditing(false);
  }, [draft, onDraftCancel]);

  const isEditing = draft || editing;

  useSettingsRowCommitOnPointerDownOutside(isEditing, rowRef, commitEdit);

  const rowClass = indent ? `${SETTINGS_LIST_ROW} pl-8 sm:pl-10` : SETTINGS_LIST_ROW;

  return (
    <li ref={rowRef} className={rowClass}>
      <div className="flex min-w-0 flex-1 items-center">
        {isEditing ? (
          <input
            ref={inputRef}
            className={SETTINGS_LIST_INPUT_EDIT}
            defaultValue={draft ? "" : value}
            placeholder={draft ? placeholder : undefined}
            autoFocus={draft || editing}
            autoComplete="off"
            spellCheck={false}
            aria-label={draft ? (placeholder ?? "Nuovo elemento") : `Modifica ${value}`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                commitEdit();
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                cancelEdit();
              }
            }}
          />
        ) : (
          <button
            type="button"
            className={`flex min-h-11 min-w-0 flex-1 items-center rounded-md px-1 text-left touch-manipulation [-webkit-tap-highlight-color:transparent] ${dsFocus}`}
            onClick={() => setEditing(true)}
            aria-label={`Modifica ${value}`}
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[color:var(--cab-text)]">{value}</span>
          </button>
        )}
      </div>
      {draft || isEditing ? null : trailing}
      <SettingsRowActionButtons
        mode={isEditing ? "edit" : "view"}
        itemLabel={itemLabel}
        onEdit={() => setEditing(true)}
        onConfirm={commitEdit}
        onCancelEdit={cancelEdit}
        onRemove={draft ? onDraftCancel ?? onRemove : onRemove}
      />
    </li>
  );
}

/** Box riga modello gerarchia — allineato a SETTINGS_LIST_ROW. */
export const SETTINGS_HIERARCHY_MODEL_BOX = `${SETTINGS_LIST_ROW} rounded-[var(--ds-radius-md)] border border-[color:var(--cab-border)] bg-[color:var(--cab-card)] px-2 hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-card))]`;

export const SETTINGS_HIERARCHY_MODEL_INPUT =
  "min-h-11 min-w-0 flex-1 border-0 bg-transparent px-2 py-0 text-sm font-medium text-[color:var(--cab-text)] outline-none placeholder:font-normal placeholder:text-[color:var(--cab-text-muted)] focus:bg-[color:color-mix(in_srgb,var(--cab-surface)_85%,var(--cab-card))] focus:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] touch-manipulation [-webkit-tap-highlight-color:transparent]";
