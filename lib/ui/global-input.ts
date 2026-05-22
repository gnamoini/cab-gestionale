/**
 * Token condivisi per select, autocomplete e date picker globali.
 * Unica fonte per radius, ombre, z-index e stati hover/focus dei dropdown.
 */
import { dsInput, gestionaleSelectFilterClass, dsZDropdown } from "@/lib/ui/design-system";

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

const globalInputDropdownChrome = [
  "max-h-52 overflow-y-auto",
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]",
  "bg-[var(--cab-card)] py-1",
  "shadow-[var(--cab-shadow-lg)]",
  "gestionale-scrollbar",
  "origin-top transition-[opacity,transform] duration-150 ease-out",
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

export const globalInputDropdownOptionBase =
  "block w-full px-3 py-2.5 text-left text-xs font-medium transition-colors";

export function globalInputDropdownOptionClass(active: boolean, selected?: boolean): string {
  if (active) {
    return `${globalInputDropdownOptionBase} bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] text-[color:var(--cab-text)]`;
  }
  if (selected) {
    return `${globalInputDropdownOptionBase} text-[color:var(--cab-text)] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,transparent)] hover:bg-[var(--cab-hover)]`;
  }
  return `${globalInputDropdownOptionBase} text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]`;
}

const autocompleteOptionBase =
  "w-full cursor-pointer rounded-md border px-2 py-1.5 text-center text-[13px] font-medium leading-tight tracking-wide transition-[filter,box-shadow] duration-150 hover:brightness-[1.06] outline-none";

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

/** Campo combobox in toolbar filtri — stessa altezza dei select filtro legacy. */
export const globalInputFieldFilter = `${gestionaleSelectFilterClass} min-h-10 cursor-text appearance-auto py-2`;

/** Campo data in filtri (icona calendario a destra). */
export const globalInputFieldFilterDate = `${globalInputFieldFilter} pr-11`;

export const globalInputInvalidRing =
  " border-[color:color-mix(in_srgb,var(--cab-danger)_55%,var(--cab-border))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-danger)_28%,transparent)]";

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

export const globalInputCalendarDayBtn = [
  "flex h-9 w-9 items-center justify-center rounded-md text-xs font-semibold transition-colors",
  "text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]",
].join(" ");

export const globalInputCalendarDaySelected =
  "bg-[color:var(--cab-primary)] text-white hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_88%,#000)]";

export const globalInputCalendarDayToday =
  "ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))]";

export const globalInputCalendarNavBtn = [
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[color:var(--cab-border)]",
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
