/**
 * Token condivisi per select, autocomplete e date picker globali.
 * Unica fonte per radius, ombre, z-index e stati hover/focus dei dropdown.
 */
import { dsInput, gestionaleSelectFilterClass, dsZDropdown } from "@/lib/ui/design-system";
import { dsIosInputTextSize } from "@/lib/ui/ios-mobile-tokens";

export const globalInputZDropdown = dsZDropdown;

const globalAutocompleteDropdownChrome = [
  "max-h-52 overflow-y-auto",
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border-strong)]",
  "bg-[var(--cab-card)]",
  "shadow-[0_12px_32px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.38)]",
  "ring-1 ring-[color:color-mix(in_srgb,var(--cab-border-strong)_70%,transparent)]",
  "gestionale-scrollbar",
  "origin-top transition-[opacity,transform] duration-150 ease-out",
].join(" ");

/** Animazione apertura menu portal (dropdown globali). */
export const globalDropdownPortalEnterClass = "global-dropdown-portal-enter";

const globalInputDropdownChrome = [
  "max-h-52 overflow-y-auto",
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]",
  "bg-[var(--cab-card)] py-1",
  "shadow-[var(--cab-shadow-lg)]",
  "gestionale-scrollbar",
  "origin-top transition-opacity duration-150 ease-out",
  globalDropdownPortalEnterClass,
].join(" ");

export const globalInputDropdownPanel = [
  "absolute left-0 right-0 top-full",
  globalInputZDropdown,
  "mt-1",
  globalInputDropdownChrome,
].join(" ");

/** Dropdown autocomplete — stesso chrome del menu pill stato (posizionamento locale). */
export const globalAutocompleteDropdownPanel = [
  "absolute left-0 right-0 top-full",
  globalInputZDropdown,
  "mt-1.5",
  globalAutocompleteDropdownChrome,
].join(" ");

/** Pannello portal (posizione via `fixed` inline — esce da overflow hidden dei filtri). */
export const globalAutocompleteDropdownPortalPanel = globalAutocompleteDropdownChrome;

export const globalInputDropdownPortalPanel = globalInputDropdownChrome;

/** Menu portal per `GlobalFixedListPillSelect` (elenchi fissi senza ricerca). */
export const globalFixedListPillMenuPanel = [
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border-strong)]",
  "bg-[var(--cab-card)] p-1",
  "shadow-[0_12px_32px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.38)]",
  "ring-1 ring-[color:color-mix(in_srgb,var(--cab-border-strong)_70%,transparent)]",
  "gestionale-scrollbar",
].join(" ");

/** Touch target ≥44px su mobile; compatto da `sm` in su. */
export const globalInputDropdownOptionBase =
  "block w-full min-h-11 px-3 py-2.5 text-left text-sm font-medium transition-colors sm:min-h-0 sm:py-2 sm:text-xs";

export function globalInputDropdownOptionClass(active: boolean, selected?: boolean): string {
  if (active) {
    return `${globalInputDropdownOptionBase} bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] text-[color:var(--cab-text)]`;
  }
  if (selected) {
    return `${globalInputDropdownOptionBase} text-[color:var(--cab-text)] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,transparent)] hover:bg-[var(--cab-hover)]`;
  }
  return `${globalInputDropdownOptionBase} text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]`;
}

/** Pannello portal mese/anno calendario promemoria (altezza da Floating UI, non `max-h-52`). */
export const promemoriaPickerMenuPanel = [
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]",
  "bg-[var(--cab-card)] p-1.5",
  "shadow-[var(--cab-shadow-lg)]",
  "gestionale-scrollbar",
  "origin-top transition-opacity duration-150 ease-out",
  globalDropdownPortalEnterClass,
].join(" ");

const promemoriaPickerOptionBase =
  "flex w-full min-h-10 items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 sm:min-h-9 sm:py-1.5";

/** Voce listbox picker promemoria — peso tipografico solo sulla selezione corrente. */
export function promemoriaPickerOptionClass(active: boolean, selected: boolean): string {
  if (active) {
    return `${promemoriaPickerOptionBase} bg-[var(--cab-hover)] font-medium text-[color:var(--cab-text)]`;
  }
  if (selected) {
    return `${promemoriaPickerOptionBase} bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] font-semibold text-[color:var(--cab-text)]`;
  }
  return `${promemoriaPickerOptionBase} font-normal text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]`;
}

/** Badge «Oggi» nel picker mese/anno. */
export const promemoriaPickerTodayBadge =
  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)] bg-[color:color-mix(in_srgb,var(--cab-text-muted)_14%,transparent)]";

const autocompleteOptionBase =
  "w-full min-h-11 cursor-pointer rounded-md border px-2 py-2.5 text-center text-sm font-medium leading-tight tracking-wide transition-[filter,box-shadow] duration-150 hover:brightness-[1.06] outline-none sm:min-h-0 sm:py-1.5 sm:text-[13px]";

export function globalAutocompleteOptionClass(active: boolean, selected?: boolean): string {
  if (active) {
    return `${autocompleteOptionBase} ring-2 ring-inset ring-white/35`;
  }
  if (selected) {
    return `${autocompleteOptionBase} ring-2 ring-inset ring-white/25 shadow-sm`;
  }
  return `${autocompleteOptionBase} border-[color:rgba(255,255,255,0.22)] bg-[var(--cab-surface-2)] text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]`;
}

export function globalAutocompleteOptionPillClass(
  active: boolean,
  selected: boolean,
  _pillStyle?: import("react").CSSProperties,
): string {
  const ring = active
    ? "ring-2 ring-inset ring-white/35"
    : selected
      ? "ring-2 ring-inset ring-white/25 shadow-sm"
      : "";
  return `${autocompleteOptionBase} border-[color:rgba(255,255,255,0.22)] ${ring}`;
}

export const globalAutocompleteAddBtnClass = [
  "flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed",
  "border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))]",
  "bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))]",
  "px-3 py-2 text-xs font-semibold text-[color:var(--cab-primary)]",
  "transition hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))]",
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))]",
].join(" ");

export const globalInputFieldDefault = dsInput;

/** Combobox filtri con ricerca/suggerimenti — no chevron select. */
export const globalInputFieldFilterSearch = [
  "min-h-10 w-full min-w-0 cursor-text appearance-auto rounded-[var(--ds-radius-lg)]",
  "border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))]",
  "bg-[var(--cab-surface)] py-2 px-3",
  dsIosInputTextSize,
  "font-medium leading-snug text-[color:var(--cab-text)]",
  "shadow-[var(--cab-shadow-sm)] outline-none",
  "transition-[border-color,box-shadow,background-color] duration-200 ease-out",
  "placeholder:text-[color:var(--cab-text-muted)]",
  "hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))]",
  "hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))]",
  "focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))]",
  "focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]",
  "touch-manipulation",
].join(" ");

/** Select nativo / combobox selectOnly in filtri — chevron a destra. */
export const globalInputFieldFilterSelect = gestionaleSelectFilterClass;

/** Combobox filtri searchable (GlobalSelect default). */
export const globalInputFieldFilter = globalInputFieldFilterSearch;

/** Campo data in filtri (icona calendario a destra). */
export const globalInputFieldFilterDate = `${globalInputFieldFilterSearch} pr-11`;

export const globalInputInvalidRing =
  " border-[color:color-mix(in_srgb,var(--cab-danger)_55%,var(--cab-border))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-danger)_28%,transparent)]";

export const globalInputInvalidMessage =
  "mt-1 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]";

export const globalInputCalendarBtn = [
  "absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center",
  "rounded-md border border-[color:var(--cab-border-strong)]",
  "bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,#000)]",
  "text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)] outline-none transition",
  "hover:border-[color:color-mix(in_srgb,var(--cab-primary)_50%,var(--cab-border))]",
  "hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]",
  "hover:text-[color:var(--cab-primary)]",
  "focus-visible:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))]",
  "focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]",
].join(" ");

const globalInputCalendarChrome = [
  "w-[min(100%,18.5rem)]",
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]",
  "bg-[var(--cab-card)] p-3 shadow-[var(--cab-shadow-lg)]",
  "origin-top transition-[opacity,transform] duration-150 ease-out",
].join(" ");

export const globalInputCalendarPanel = [
  "absolute right-0 top-full mt-1",
  globalInputZDropdown,
  globalInputCalendarChrome,
].join(" ");

export const globalInputCalendarPortalPanel = globalInputCalendarChrome;

/** Contenitore griglia calendario embedded (dashboard promemoria, senza posizionamento popup). */
export const globalInputCalendarGridShell = [
  "overflow-hidden rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]",
  "bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]",
].join(" ");

export const globalInputCalendarDayBtn = [
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-xs font-semibold transition-colors",
  "text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]",
  "disabled:pointer-events-none disabled:cursor-default disabled:opacity-25",
].join(" ");

export const globalInputCalendarDaySelected =
  "bg-[color:var(--cab-primary)] text-white hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_88%,#000)]";

export const globalInputCalendarDayToday =
  "ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))]";

export const globalInputCalendarNavBtn = [
  "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[color:var(--cab-border)]",
  "text-[color:var(--cab-text)] transition hover:bg-[var(--cab-hover)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]",
].join(" ");

export const globalInputEmptyMessage = "Nessun risultato";

export {
  chainGestionaleEnterKeyDown,
  focusNextGestionaleField,
  gestionaleAdvanceFocusOnEnter,
  scheduleFocusNextGestionaleField,
} from "@/lib/ui/gestionale-focus-navigation";
