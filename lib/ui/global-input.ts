/**
 * Token condivisi per select, autocomplete e date picker globali.
 * Unica fonte per radius, ombre, z-index e stati hover/focus dei dropdown.
 */
import { dsInput, dsPageToolbarBtn, gestionaleSelectFilterClass, dsZDropdown } from "@/lib/ui/design-system";
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

/** Animazione apertura menu account — slide morbido senza scale. */
export const accountMenuPortalEnterClass = "account-menu-portal-enter";

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

/** Pannello portal menu account (posizione fixed via portal). */
export const accountMenuPortalPanel = [
  "min-w-0 w-full",
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border-strong)]",
  "bg-[var(--cab-card)] p-0",
  "shadow-[0_12px_32px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.38)]",
  "ring-1 ring-[color:color-mix(in_srgb,var(--cab-border-strong)_70%,transparent)]",
  "gestionale-scrollbar",
].join(" ");

export const accountMenuHeaderClass =
  "mx-1.5 mt-1.5 mb-1 flex items-center gap-3 rounded-[var(--ds-radius-md)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_42%,var(--cab-card))] px-2.5 py-2.5 ring-1 ring-[color:color-mix(in_srgb,var(--cab-border)_60%,transparent)]";

/** Trigger profilo nel blocco sessione (SidebarNavRow). */
export const accountMenuSessionTriggerClass =
  "cab-sidebar-nav-row w-full text-left transition-colors duration-150";

/** Voci espandibili (drawer inline / portal sidebar). */
export const accountMenuSessionMenuClass =
  "cab-sidebar-session-menu border-t border-[color:color-mix(in_srgb,var(--cab-border)_80%,transparent)] px-1 py-1";

/** Riga notifiche nel blocco sessione (SidebarNavRow). */
export const sidebarSessionRowClass =
  "cab-sidebar-nav-row w-full text-left transition-colors duration-150";

export const accountMenuItemClass =
  "flex w-full min-h-11 items-center gap-2.5 rounded-[var(--ds-radius-md)] px-2.5 py-2 text-left text-xs font-medium text-[color:var(--cab-text)] transition-colors duration-150 hover:bg-[var(--cab-hover)] sm:min-h-10";

export const accountMenuItemMutedIconClass = "h-4 w-4 shrink-0 text-[color:var(--cab-text-muted)]";

/** Trigger menu account in header (legacy toolbar). */
export const accountMenuTriggerBaseClass = `${dsPageToolbarBtn} h-11 min-h-11 w-11 min-w-11 max-w-11 justify-center gap-0 p-1.5 sm:h-11 sm:w-auto sm:min-w-0 sm:max-w-[14rem] sm:justify-start sm:gap-2.5 sm:pl-1.5 sm:pr-2.5 sm:py-0`;

export const accountMenuTriggerLabelClass =
  "hidden min-w-0 flex-1 truncate text-left sm:block";

export const accountMenuTriggerChevronWrapClass = "hidden shrink-0 sm:block";

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
  "flex w-full min-h-11 items-center justify-center gap-1.5 rounded-md border border-dashed sm:min-h-0",
  "border-[color:color-mix(in_srgb,var(--cab-primary)_58%,var(--cab-border))]",
  "bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))]",
  "px-3 py-2.5 text-xs font-semibold sm:py-2",
  "text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))]",
  "transition hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-surface))]",
  "disabled:cursor-not-allowed disabled:border-[color:var(--cab-border)]",
  "disabled:bg-[color:color-mix(in_srgb,var(--cab-text-muted)_10%,var(--cab-surface))]",
  "disabled:text-[color:var(--cab-text-muted)]",
  "disabled:hover:bg-[color:color-mix(in_srgb,var(--cab-text-muted)_10%,var(--cab-surface))]",
].join(" ");

export const globalInputFieldDefault = dsInput;

/** Shell tag-input multi-select: bordo unico, chip + combobox interni. */
export const globalMultiSelectShellClass = [
  "w-full rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))]",
  "bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)] outline-none",
  "transition-[border-color,box-shadow] duration-200",
  "focus-within:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))]",
  "focus-within:ring-2 focus-within:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]",
].join(" ");

/** Input combobox incapsulato nel multi-select — senza bordo proprio. */
export const globalMultiSelectEmbeddedInputClass = [
  "w-full min-w-0 rounded-none border-0 bg-transparent px-3 py-2.5 shadow-none outline-none ring-0",
  dsIosInputTextSize,
  "text-[color:var(--cab-text)] placeholder:text-[color:var(--cab-text-muted)]",
  "hover:border-transparent focus:border-transparent focus:ring-0 focus-visible:ring-0",
  "touch-manipulation",
].join(" ");

/** Chip selezione dentro multi-select. */
export const globalMultiSelectChipClass = [
  "inline-flex max-w-full items-center gap-0.5 rounded-md",
  "border border-[color:color-mix(in_srgb,var(--cab-primary)_24%,var(--cab-border))]",
  "bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]",
  "pl-2 pr-0.5 py-0.5 text-[11px] font-semibold leading-snug text-[color:var(--cab-text)]",
].join(" ");

export const globalMultiSelectChipRemoveClass = [
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
  "text-sm leading-none text-[color:var(--cab-text-muted)]",
  "hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,transparent)] hover:text-[color:var(--cab-text)]",
  "active:bg-[color:color-mix(in_srgb,var(--cab-primary)_20%,transparent)]",
].join(" ");

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

/** Campo data in filtri (layout split input + calendario — v. `globalInputDatePickerShell`). */
export const globalInputFieldFilterDate = globalInputFieldFilterSearch;

export const globalInputInvalidRing =
  " border-[color:color-mix(in_srgb,var(--cab-danger)_55%,var(--cab-border))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-danger)_28%,transparent)]";

/** Applica ring errore SSOT a classi input plain (GlobalSelect/DatePicker usano lo stesso token). */
export function resolveGestionaleInputClassName(baseClass: string, invalid?: boolean): string {
  return invalid ? `${baseClass}${globalInputInvalidRing}` : baseClass;
}

export const globalInputInvalidMessage =
  "mt-1 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]";

const globalInputDatePickerShellChrome = [
  "flex w-full min-w-0 items-stretch overflow-hidden",
  "rounded-[var(--ds-radius-lg)]",
  "border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))]",
  "bg-[var(--cab-surface)]",
  "shadow-[var(--cab-shadow-sm)]",
  "transition-[border-color,box-shadow,background-color] duration-200 ease-out",
  "hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))]",
  "hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))]",
  "focus-within:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))]",
  "focus-within:ring-2 focus-within:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]",
  "touch-manipulation",
].join(" ");

/** Shell filtri / toolbar — bordo unico attorno a input testo + trigger calendario. */
export const globalInputDatePickerShellFilter = globalInputDatePickerShellChrome;

/** Shell form default (bordo leggermente più marcato come `dsInput`). */
export const globalInputDatePickerShellDefault = [
  "flex w-full min-w-0 items-stretch overflow-hidden",
  "rounded-[var(--ds-radius-lg)]",
  "border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))]",
  "bg-[var(--cab-surface)]",
  "shadow-[var(--cab-shadow-sm)]",
  "transition-[border-color,box-shadow,background-color] duration-200 ease-out",
  "hover:border-[color:var(--cab-border-strong)]",
  "focus-within:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))]",
  "focus-within:ring-2 focus-within:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]",
  "touch-manipulation",
].join(" ");

/** Segmento testo date picker (senza bordo — chrome sulla shell). */
export const globalInputDatePickerInput = [
  "min-h-10 min-w-0 flex-1 border-0 bg-transparent",
  "px-3 py-2",
  dsIosInputTextSize,
  "font-medium leading-snug text-[color:var(--cab-text)]",
  "outline-none shadow-none ring-0",
  "placeholder:text-[color:var(--cab-text-muted)]",
].join(" ");

/** Trigger calendario affiancato — stessa altezza del campo (`items-stretch` sulla shell). */
export const globalInputDatePickerCalendarBtn = [
  "flex w-10 shrink-0 items-center justify-center self-stretch",
  "border-0 border-l border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))]",
  "bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,#000)]",
  "text-[color:var(--cab-text)] outline-none transition",
  "hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]",
  "hover:text-[color:var(--cab-primary)]",
  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

/** @deprecated Usare `globalInputDatePickerCalendarBtn` nel layout split. */
export const globalInputCalendarBtn = globalInputDatePickerCalendarBtn;

/** Pulsante svuota su combobox con valore committato (scheda ingresso, form opzionali). */
export const globalInputComboboxClearBtn = [
  "absolute right-0 top-0 z-[2] flex h-full w-10 items-center justify-center",
  "text-[color:var(--cab-text-muted)] outline-none transition",
  "hover:text-[color:var(--cab-text)]",
  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

/** Rimuove chrome duplicato quando `inputClassName` passa token campo intero (es. filtri). */
export function stripDatePickerFieldChrome(className: string): string {
  return className
    .split(/\s+/)
    .filter((tok) => {
      if (!tok) return false;
      if (/^pr-/.test(tok)) return false;
      if (tok === "w-full" || tok === "min-w-0") return false;
      if (/^rounded/.test(tok)) return false;
      if (tok === "border" || /^border-/.test(tok)) return false;
      if (/^shadow/.test(tok)) return false;
      if (tok === "outline-none" || /^outline-/.test(tok)) return false;
      if (/^hover:/.test(tok) || /^focus:/.test(tok) || /^focus-visible:/.test(tok)) return false;
      if (tok.startsWith("bg-")) return false;
      if (tok === "appearance-auto" || tok === "cursor-text") return false;
      if (/^transition/.test(tok)) return false;
      if (tok === "touch-manipulation") return false;
      return true;
    })
    .join(" ");
}

/** Classi layout (h/mt/w) da applicare alla shell, non al segmento testo. */
export function extractDatePickerShellLayoutClass(className: string): string {
  return className
    .split(/\s+/)
    .filter((tok) => /^(?:w-full|!?h-\S+|!?min-h-\S+|mt-\S+|mb-\S+)$/.test(tok))
    .join(" ");
}

/** 7×36px celle + gap + padding — popup non segue anchor stretti (es. colonna data capture). */
export const GLOBAL_DATE_PICKER_CALENDAR_PANEL_WIDTH = 300;

const globalInputCalendarChrome = [
  "w-full min-w-0",
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
