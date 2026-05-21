/**
 * Token condivisi per select, autocomplete e date picker globali.
 * Unica fonte per radius, ombre, z-index e stati hover/focus dei dropdown.
 */
import { dsInput, gestionaleSelectFilterClass } from "@/lib/ui/design-system";

export const globalInputZDropdown = "z-[var(--ds-z-dropdown,50)]";

export const globalInputDropdownPanel = [
  "absolute left-0 right-0 top-full",
  globalInputZDropdown,
  "mt-1 max-h-52 overflow-y-auto",
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]",
  "bg-[var(--cab-card)] py-1",
  "shadow-[var(--cab-shadow-lg)]",
  "gestionale-scrollbar",
  "origin-top transition-[opacity,transform] duration-150 ease-out",
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

export const globalInputCalendarPanel = [
  "absolute right-0 top-full mt-1 w-[min(100%,18.5rem)]",
  globalInputZDropdown,
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)]",
  "bg-[var(--cab-card)] p-3 shadow-[var(--cab-shadow-lg)]",
  "origin-top transition-[opacity,transform] duration-150 ease-out",
].join(" ");

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
