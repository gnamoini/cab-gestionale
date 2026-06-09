/**
 * CAB Gestionale — design system (classi Tailwind + token CSS `--cab-*` / `--ds-*`).
 *
 * Categorie:
 * A — Primario (CTA, Salva): `dsBtnPrimary`, `dsBtnCtaHero`
 * B — Secondario / neutro: `dsBtnSecondary`, `dsBtnNeutral`, `dsBtnSubtle`, `dsBtnSoftOrange`
 * B2 — Ghost: `dsBtnGhost`
 * C — Pericolo: `dsBtnDanger`
 * D — Icon: `dsBtnIcon`
 * E — Select / dropdown nativi: `gestionaleSelectFilterClass`, …
 * F — Input / textarea: `dsInput`, `dsTextarea`, `dsInputAuth`
 * G — Tabella liste: master **Lavorazioni** — `GestionaleListTable` + `@/lib/ui/gestionale-list-table` (token); primitivi in `@/lib/ui/global-table`
 * H — Card / KPI: `dsSurfaceCard`, `dsSurfaceInteractiveKpi`
 * I — Modale: `dsModalBackdrop`, `dsModalPanel`, `dsLavorazioniModalLayer`, …
 * J — Badge: `dsBadgeNeutral`, …
 * K — Scrollbar: `gestionale-scrollbar` (globals) + `@/lib/ui/scroll-system` (`dsScrollbar`, `dsScrollY`, …)
 * L — Tipografia: `dsTypoPageTitle`, `dsSectionTitle`, …
 * M — Z-index / layer: `dsZHeader`, `dsZDrawer`, `dsZModal`, `dsZModalHigh`, `dsZToast`
 * N — Skeleton: `dsSkeletonLine`, `dsSkeletonBlock`
 */

import {
  globalTableEmptyCell,
  globalTableRow,
  globalTableWrap,
} from "@/lib/ui/global-table";
import { layoutPageContainer } from "@/lib/ui/responsive-layout-core";
import {
  cabModalDialogBase,
  cabModalDialogDesktop,
  cabModalDialogMobile,
  cabModalLayerDesktop,
  cabModalLayerGestionale,
  cabModalLayerMobile,
  cabModalLayerShared,
  dsIosInputTextSize,
} from "@/lib/ui/ios-mobile-tokens";

const cabText = "text-[color:var(--cab-text)]";
const cabTextMuted = "text-[color:var(--cab-text-muted)]";
const cabBorder = "border-[color:var(--cab-border)]";
const cabSurface = "bg-[var(--cab-surface)]";
const cabCard = "bg-[var(--cab-card)]";

/** Sfondo pieno primario — stesso token arancione della scritta (`text-[color:var(--cab-primary)]`). */
export const cabPrimaryBg = "bg-[color:var(--cab-primary)]";
export const cabPrimaryBgHover =
  "hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_88%,#000)] active:bg-[color:color-mix(in_srgb,var(--cab-primary)_88%,#000)]";

/** Evidenziazione riga/card attiva (arancione piatto). */
export const dsAccentRowHighlight =
  "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_45%,transparent)] ring-2 ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)]";

/** Banner informativo accent (sfondo soft monocolore). */
export const dsAccentSoftBanner =
  "rounded-lg border border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_88%,var(--cab-text))]";

/** Toggle pill attivo (arancione piatto). */
export const dsAccentToggleOn =
  "border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_15%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))]";

/** Focus ring e micro-feedback click — usare su tutti i controlli interattivi. */
export const dsFocus =
  "outline-none transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_42%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--cab-bg-app)] dark:focus-visible:ring-offset-[var(--cab-bg-app)]";

export const dsDisabled = "disabled:pointer-events-none disabled:opacity-55 disabled:cursor-not-allowed";

/** Cursore manina su controlli cliccabili (bottoni design system). */
const dsBtnCursor = "cursor-pointer";

/** D — Neutro: Chiudi, Annulla, azioni discrete */
export const dsBtnNeutral = `inline-flex items-center justify-center gap-1.5 rounded-[var(--ds-radius-lg)] ${cabBorder} ${cabSurface} px-2.5 py-2 text-xs font-medium ${cabText} shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)] hover:ring-1 hover:ring-[color:color-mix(in_srgb,var(--cab-border)_75%,transparent)] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

/**
 * Toolbar header pagina (`PageHeader`):
 * - shell: `dsPageHeaderShell`
 * - solo icona: `dsPageToolbarIconBtn` (40×40)
 * - icona + testo: `dsPageToolbarBtn`
 */
export const dsPageToolbarBtn = `inline-flex min-h-[2.5rem] min-w-0 shrink-0 items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] ${cabSurface} px-3 py-2 text-xs font-semibold ${cabText} shadow-[var(--cab-shadow-sm)] transition-[background-color,box-shadow,ring-color,border-color,color] duration-200 ease-out hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)] hover:ring-1 hover:ring-[color:color-mix(in_srgb,var(--cab-border-strong)_70%,transparent)] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

/** Solo icona in toolbar header — footprint quadrato 40×40. */
export const dsPageToolbarIconBtn = `${dsPageToolbarBtn} h-10 w-10 min-h-0 p-0`;

export const dsBtnSettings = dsPageToolbarBtn;

/** A — Primario */
export const dsBtnPrimary = `inline-flex items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] ${cabPrimaryBg} px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--cab-shadow-sm)] ${cabPrimaryBgHover} hover:shadow-[var(--cab-shadow-md)] hover:ring-2 hover:ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

/** A — CTA hero (stesso arancio piatto del primario) */
export const dsBtnCtaHero = `inline-flex items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] ${cabPrimaryBg} px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--cab-shadow-md)] transition-[box-shadow,background-color] duration-200 ease-out ${cabPrimaryBgHover} hover:shadow-lg ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

/** CTA toolbar liste — compatto su mobile, hero da sm+. */
export const dsPageToolbarCtaCompact = `${dsBtnCtaHero} h-11 min-w-0 shrink-0 px-2.5 text-xs whitespace-nowrap sm:px-5 sm:py-2.5 sm:text-sm`;

/** Coppia etichette CTA toolbar: usare con `PageToolbarCtaLabel` da `@/components/design-system`. */
export function pageToolbarCtaLabels(full: string, short: string): { full: string; short: string } {
  return { full, short };
}

/** B — Secondario soft arancio */
export const dsBtnSoftOrange = `inline-flex items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] px-2.5 py-1.5 text-xs font-medium ${cabText} shadow-[var(--cab-shadow-sm)] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_16%,var(--cab-surface))] hover:shadow-[var(--cab-shadow-md)] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

export const dsBtnIcon = `inline-flex min-w-[2rem] items-center justify-center rounded-[var(--ds-radius-lg)] ${cabBorder} ${cabSurface} px-2 py-1.5 text-xs font-medium ${cabText} shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

/** Pulsante ± stepper quantità — stessa famiglia di `dsBtnIcon`, footprint fisso 36×36. */
export const dsStepperBtn = `inline-flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-[var(--ds-radius-lg)] border-2 border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} p-0 text-sm font-semibold ${cabText} shadow-[var(--cab-shadow-sm)] hover:border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border-strong))] hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)] ${dsBtnCursor} ${dsFocus} [-webkit-tap-highlight-color:transparent]`;

export const dsBtnSubtle = `inline-flex items-center justify-center gap-1.5 rounded-[var(--ds-radius-lg)] ${cabBorder} bg-[color:color-mix(in_srgb,var(--cab-surface-2)_85%,var(--cab-surface))] px-3 py-2 text-xs font-medium ${cabText} shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

/** B2 — Ghost (toolbar secondaria, filtri testuali) */
export const dsBtnGhost = `inline-flex items-center justify-center gap-1.5 rounded-[var(--ds-radius-lg)] border border-transparent bg-transparent px-2.5 py-2 text-xs font-medium ${cabTextMuted} hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

/** B — alias “secondario” tab toolbar */
export const dsBtnSecondary = dsBtnNeutral;

/** C — Pericolo */
export const dsBtnDanger = `inline-flex items-center justify-center gap-1.5 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-surface))] px-3 py-2 text-sm font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))] shadow-[var(--cab-shadow-sm)] hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_20%,var(--cab-surface))] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

/** F — Input su sfondo chiaro (form gestionale) */
export const dsInput = `w-full rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] ${cabSurface} px-3 py-2.5 ${dsIosInputTextSize} ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[color:var(--cab-text-muted)] hover:border-[color:var(--cab-border-strong)] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${dsFocus} touch-manipulation`;

/** F — Campo ricerca toolbar (icona a sinistra, `min-h-11`; focus inset senza doppio ring). */
export const dsSearchFieldInput = `w-full min-h-11 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] ${cabSurface} py-0 pl-10 pr-3 ${dsIosInputTextSize} ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[color:var(--cab-text-muted)] hover:border-[color:var(--cab-border-strong)] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_48%,var(--cab-border))] focus:outline-none focus-visible:border-[color:color-mix(in_srgb,var(--cab-primary)_48%,var(--cab-border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_22%,transparent)] touch-manipulation`;

export const dsTextarea = `${dsInput} gestionale-textarea min-h-[var(--cab-textarea-min-h,5.5rem)] resize-none overflow-y-auto`;

/** Tetto default auto-grow textarea (scroll interno oltre il limite — sicuro mobile/iOS). */
export const gestionaleTextareaMaxHeightDefault = "min(35dvh, 16rem)";

/** Tetto compatto per celle tabella (Bunder, schede). */
export const gestionaleTextareaMaxHeightCompact = "min(28dvh, 8rem)";

export type GestionaleTextareaSize = "sm" | "md" | "lg";

/** F — Checkbox nativo (login, footer modali, form gestionale). */
export const dsCheckboxInput =
  "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[color:var(--cab-border-strong)] text-[var(--cab-primary)] shadow-[var(--cab-shadow-sm)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_30%,transparent)] disabled:cursor-not-allowed disabled:opacity-50";

/** F — Opzione checkbox in card (footer modali, toggle secondari). */
export const dsCheckboxOptionLabel = `flex min-w-0 cursor-pointer items-start gap-3 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} px-3 py-2.5 text-left shadow-[var(--cab-shadow-sm)] transition-[border-color,background-color,box-shadow] duration-150 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)] has-[:checked]:border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] has-[:checked]:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] has-[:checked]:shadow-[var(--cab-shadow-md)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55`;

/** I — Footer form modale (checkbox opzionale + azioni). */
export const dsModalFormFooter =
  "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[color:var(--cab-border)] bg-[var(--cab-card)] px-4 py-3";

export const dsInputAuth = `w-full rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border-strong)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_90%,#000)] px-3 py-2.5 text-base text-[color:var(--cab-text)] shadow-md shadow-black/20 outline-none ring-[color:color-mix(in_srgb,var(--cab-primary)_18%,transparent)] placeholder:text-[color:var(--cab-text-muted)] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_50%,var(--cab-border))] focus:ring-2 ${dsFocus} ${dsDisabled} touch-manipulation`;

/** E — Chevron select */
const selectChevronWhite =
  "bg-[length:1.15rem] bg-[right_0.55rem_center] bg-no-repeat bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f4f4f5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.25' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]";

/** Chevron accent filtri — colore da `--cab-select-chevron-accent` (aggiornato dal branding). */
const gestionaleSelectChevronAccent =
  "bg-[length:1.1rem] bg-[right_0.55rem_center] bg-no-repeat bg-[image:var(--cab-select-chevron-accent)]";

export const selectLavorazioniInline =
  `lavorazioni-select-dk min-w-0 max-w-[11rem] h-10 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border-strong)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_92%,#000)] py-2 pl-7 pr-8 text-base md:text-xs font-medium text-[color:var(--cab-text)] shadow-md shadow-black/25 outline-none transition-all duration-200 ease-out hover:border-[color:var(--cab-border)] hover:brightness-[1.05] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_30%,transparent)] ${selectChevronWhite} touch-manipulation`;

export const gestionaleSelectFilterClass =
  `min-h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} py-2.5 pl-9 pr-10 ${dsIosInputTextSize} font-semibold leading-snug ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${gestionaleSelectChevronAccent} touch-manipulation`;

/** Pulsante / toggle filtro in riga con i select `gestionaleSelectFilterClass` (stessa altezza, raggio, peso tipografico). */
export const gestionaleFilterChipClass =
  `inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} px-3 py-2.5 text-sm font-semibold leading-snug ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${dsFocus}`;

export const selectLavorazioniFilter = gestionaleSelectFilterClass;

export const gestionaleSelectNativePlainClass =
  `min-h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} py-2.5 pl-3 pr-10 ${dsIosInputTextSize} font-semibold leading-snug ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${gestionaleSelectChevronAccent} touch-manipulation`;

export const lavorazioniModalSelectClass =
  `min-h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] ${cabBorder} ${cabSurface} py-2.5 pl-3 pr-10 ${dsIosInputTextSize} font-medium leading-snug ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_50%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_22%,transparent)] touch-manipulation`;

/** G — contenitore tabella liste (alias token globale; preferire `<GlobalTable>`) */
export const dsTableWrap = globalTableWrap;

/** Desktop ≥1280px: niente scroll orizzontale pagina; scroll interno solo sotto breakpoint. */
export const dsTableWrapDesktopFit =
  `max-w-full overflow-x-auto rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} shadow-[var(--cab-shadow-sm)] xl:overflow-x-hidden`;

export const dsTable = `min-w-full border-collapse text-left text-[13px] leading-tight ${cabText}`;

/** Tabella a larghezza fissa colonne — usare con `colgroup` percentuali (target 1366px). */
export const dsTableFixed = `${dsTable} w-full table-fixed`;

/** Cella testo troncato (descrizioni lunghe). */
export const dsTableCellTruncate = "min-w-0 max-w-0 truncate";

/** Intestazione tabella: applicare a `<thead>` o celle `<th>` insieme a `border-b` se serve */
/** @deprecated Nuove liste dense: `GlobalTableHead` + `GlobalTableSortTh` / `GlobalTableHeadLabel`. */
export const dsTableHead = `bg-[var(--cab-surface-2)] text-[10px] font-semibold uppercase tracking-wide ${cabTextMuted}`;

/** Riga corpo tabella standard (alias token globale) */
export const dsTableRow = globalTableRow;

/** @deprecated Preferire `GlobalTableSortTh` da `@/components/gestionale/global-table`. */
export const dsTableSortTh = `border-b ${cabBorder} bg-[var(--cab-surface-2)] px-2.5 py-2 align-middle text-xs font-semibold uppercase tracking-wide`;

/** Celle `<th>` statiche (header tabella modali / report) */
/** @deprecated Nuove liste/modali: `GlobalTableHeadLabel` (13px, token `globalTableThCell` + `globalTableThLabel`). */
export const dsTableHeadCell = `border-b ${cabBorder} bg-[var(--cab-surface-2)] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide ${cabTextMuted} sm:px-2.5`;

/** Colonna indice / rank */
export const dsTableThPos = `w-6 min-w-[1.5rem] max-w-[1.75rem] border-b ${cabBorder} bg-[var(--cab-surface-2)] px-0.5 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide ${cabTextMuted}`;

/** Header colonna confronto */
export const dsTableThCompare = `border-b ${cabBorder} bg-[var(--cab-surface-2)] px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide ${cabTextMuted} sm:px-3`;

/** Celle dati compatte (report / modali) */
export const dsTableTd = `px-2 py-2 align-middle text-[13px] sm:px-2.5 ${cabText}`;

/** Empty state riga tabella (alias token globale) */
export const dsTableEmptyCell = globalTableEmptyCell;

/** G — Celle corpo compatte (non colonna azioni). */
export const dsTableTdCompact = `px-2 py-1.5 align-middle text-[13px] ${cabText}`;

/** G — Colonna azioni tabella (celle `<td>` / header `<th>` statico). */
export const dsTableTdActions = "whitespace-nowrap px-2 py-1 align-middle text-center";

/** G — Header colonna Azioni (etichetta statica). */
export const dsTableThActions = "whitespace-nowrap px-2 py-2 align-middle text-center";

/** Altezza fissa riga pulsanti azione (36px, allineata alle pill `min-h-8`). */
export const dsTableActionsRowHeight = "h-10 min-h-10 max-h-10 sm:h-9 sm:min-h-9 sm:max-h-9";

/** G — Gruppo pulsanti azione tabella (preset ufficiale Lavorazioni). */
export const dsTableActionsGroup =
  "inline-flex w-max max-w-full min-w-0 flex-wrap items-stretch justify-center gap-1.5 sm:gap-1 xl:h-9 xl:min-h-9 xl:max-h-9 xl:max-w-none xl:flex-nowrap";

/** Gruppo azioni allineato a destra (card mobile / toolbar). */
export const dsTableActionsGroupEnd =
  "inline-flex w-max max-w-full min-w-0 flex-wrap items-stretch justify-end gap-1.5 sm:gap-1 xl:h-9 xl:min-h-9 xl:max-h-9 xl:max-w-none xl:flex-nowrap";

/** Gruppo azioni allineato a sinistra (toolbar secondaria). */
export const dsTableActionsGroupStart =
  "inline-flex w-max max-w-full min-w-0 flex-wrap items-stretch justify-start gap-1 xl:h-9 xl:min-h-9 xl:max-h-9 xl:max-w-none xl:flex-nowrap";

/** Footer azioni card mobile: wrap, stesso `gap-1` / `items-stretch` del gruppo tabella. */
export const dsCardMobileActionsGroup =
  "inline-flex max-w-full min-w-0 flex-wrap items-stretch justify-end gap-1.5";

/** Shell card stack sotto breakpoint `md` (contenuto + footer azioni). */
export const dsCardMobileShell =
  "flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90";

/** G — Icone outline nelle azioni tabella (24×24, stroke 2). */
export const dsTableActionGlyph = "h-4 w-4 shrink-0 opacity-90";

const dsTableActionSqBase =
  `inline-flex ${dsTableActionsRowHeight} w-10 min-w-10 max-w-10 sm:w-9 sm:min-w-9 sm:max-w-9 shrink-0 items-center justify-center rounded-lg border-2 p-0 shadow-[var(--cab-shadow-sm)] outline-none transition-[background-color,border-color,box-shadow,color,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed box-border ${dsBtnCursor} ${dsFocus}`;

/** Pulsante azione con badge contatore (es. schede 1/3) — aggiungere `dsTableActionBadge` come figlio. */
export const dsTableActionBtnWithBadge = "relative";

/** Badge angolo su pulsante azione tabella. */
export const dsTableActionBadge =
  "pointer-events-none absolute right-0 top-0 rounded-full border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-0.5 text-[8px] font-bold leading-3 text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)]";

/** Azione primaria su riga (es. + scorta, salva rapido). */
export const dsTableActionBtnPrimary = `${dsTableActionSqBase} border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] text-[color:var(--cab-primary)] hover:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-surface))]`;

/** Azione secondaria / info / link (icona). */
export const dsTableActionBtnSecondary = `${dsTableActionSqBase} border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} text-[color:var(--cab-text-muted)] hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]`;

/** Info / dettagli (stessa scatola neutra della secondaria). */
export const dsTableActionBtnInfo = dsTableActionBtnSecondary;

/** Annulla / undo (stessa scatola neutra; distinzione per icona). */
export const dsTableActionBtnUndo = dsTableActionBtnSecondary;

/** Azione distruttiva (elimina). */
export const dsTableActionBtnDanger = `${dsTableActionSqBase} border-[color:color-mix(in_srgb,var(--cab-danger)_42%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))] hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_18%,var(--cab-surface))]`;

/** Azione testuale su una riga (tabella, toolbar compatta) — `h-9`. */
export const dsTableActionTextBtn = `inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} px-2.5 text-xs font-semibold ${cabText} shadow-[var(--cab-shadow-sm)] transition-[background-color,border-color,box-shadow] duration-150 hover:bg-[var(--cab-hover)] ${dsBtnCursor} ${dsFocus} disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed`;

/** Azione testuale primaria (tabella) — `h-9`. */
export const dsTableActionTextBtnPrimary = `inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] px-2.5 text-xs font-semibold text-[color:var(--cab-primary)] shadow-[var(--cab-shadow-sm)] transition-[background-color,border-color,box-shadow,color] duration-150 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-surface))] ${dsBtnCursor} ${dsFocus} disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed`;

/** Azione testuale distruttiva (tabella) — `h-9`. */
export const dsTableActionTextBtnDanger = `inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-danger)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-surface))] px-2.5 text-xs font-semibold text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))] shadow-[var(--cab-shadow-sm)] transition-[background-color,border-color,box-shadow] duration-150 hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_18%,var(--cab-surface))] ${dsBtnCursor} ${dsFocus} disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed`;

/** Hub schede (PDF / Modifica / Elimina): stessa silhouette di `dsBtnPrimary` («Crea nuova»). */
const dsSchedaHubBtnBase = `inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--ds-radius-lg)] px-4 py-2.5 text-sm font-semibold shadow-[var(--cab-shadow-sm)] transition-[background-color,border-color,box-shadow,color] duration-150 ${dsBtnCursor} ${dsFocus} disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed`;

export const dsSchedaHubBtn = `${dsSchedaHubBtnBase} border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} ${cabText} hover:bg-[var(--cab-hover)]`;

export const dsSchedaHubBtnPrimary = `${dsSchedaHubBtnBase} border border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] text-[color:var(--cab-primary)] hover:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-surface))]`;

export const dsSchedaHubBtnDanger = `${dsSchedaHubBtnBase} border border-[color:color-mix(in_srgb,var(--cab-danger)_40%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_10%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-danger)_92%,var(--cab-text))] hover:bg-[color:color-mix(in_srgb,var(--cab-danger)_18%,var(--cab-surface))]`;

/** Area drop upload — stato base (bordo tratteggiato). */
export const dsUploadDropExpand =
  "flex min-w-0 flex-col items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border-2 border-dashed border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] px-4 py-6 text-center transition-all duration-200";

/** Area drop upload — file in trascinamento sopra la zona. */
export const dsUploadDropExpandActive =
  "border-[color:var(--cab-primary)] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cab-primary)_25%,transparent)]";

/** Overlay drop su card hub compatta — ring inset, senza ombre esterne che escono dal bordo. */
export const dsUploadDropOverlay =
  "absolute inset-0 z-10 flex min-w-0 items-center justify-center overflow-hidden rounded-[inherit] bg-[color:color-mix(in_srgb,var(--cab-primary)_16%,var(--cab-card))] px-2 py-1 text-center transition-[background-color,box-shadow] duration-150";

export const dsUploadDropOverlayActive =
  "ring-2 ring-inset ring-[color:color-mix(in_srgb,var(--cab-primary)_50%,transparent)]";

/** H — Card statica */
export const dsSurfaceCard = `min-w-0 max-w-full rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} shadow-[var(--cab-shadow-sm)]`;

export const dsSurfacePanel = `flex min-h-[220px] flex-col rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabSurface} p-4 shadow-[var(--cab-shadow-sm)] transition-all duration-200 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] hover:shadow-[var(--cab-shadow-md)] ${dsFocus}`;

/** Pannello contenitore non cliccabile (es. sezioni dashboard con controlli interni). */
export const dsSurfacePanelStatic = `flex min-h-[220px] flex-col cursor-default rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabSurface} p-4 shadow-[var(--cab-shadow-sm)]`;

export const dsSurfaceInteractiveKpi = `group flex h-full min-h-[220px] flex-col rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabSurface} p-4 text-left shadow-[var(--cab-shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] hover:shadow-[var(--cab-shadow-md)] active:scale-[0.99] ${dsFocus}`;

/** Tile interna navigazione rapida (dentro `dsSurfaceCard` principale). */
export const dsSurfaceQuickNavTile = `group flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-[var(--ds-radius-xl)] border px-3 py-3.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] hover:shadow-[var(--cab-shadow-md)] active:scale-[0.98] border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] text-[color:var(--cab-text)]`;

/** Tile disabilitata (staging) — stesso layout centrato della quick nav. */
export const dsSurfaceQuickNavTileDisabled = `group flex min-h-[5.5rem] cursor-not-allowed flex-col items-center justify-center gap-2 rounded-[var(--ds-radius-xl)] border border-dashed px-3 py-3.5 text-center opacity-70 ${cabBorder}`;

export const dsModalBackdrop =
  `fixed inset-0 z-50 flex min-w-0 overflow-x-hidden ${cabModalLayerShared} ${cabModalLayerMobile} ${cabModalLayerDesktop}`;

export const dsModalPanel =
  `${cabModalDialogBase} ${cabModalDialogMobile} ${cabModalDialogDesktop} min-w-0 max-w-full overflow-x-hidden max-md:border-0 md:max-h-[min(92dvh,720px)] md:max-w-lg md:rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} md:shadow-[var(--cab-shadow-md)] p-4 max-md:p-0`;

/** Modali Lavorazioni: mobile sheet edge-to-edge; desktop finestra centrata sul backdrop. */
export const dsLavorazioniModalLayer =
  `fixed inset-0 z-[100] flex min-w-0 overflow-x-hidden ${cabModalLayerShared} ${cabModalLayerMobile} ${cabModalLayerDesktop} max-md:flex-col max-md:items-stretch max-md:justify-stretch max-md:p-0 max-md:pb-[env(safe-area-inset-bottom)]`;
/** @deprecated — overlay integrato in `dsLavorazioniModalLayer`; non usare più. */
export const dsLavorazioniModalOverlay = "hidden";

/** Frame modale gestionale: header full-bleed + corpo sotto (role=dialog). */
export const dsGestionaleModalFrame =
  "relative z-[1] flex min-h-0 w-full flex-1 flex-col overflow-hidden max-md:max-h-[min(100dvh,calc(var(--cab-vv-height,100dvh)))]";

/** Area sotto l'header: pannello centrato su desktop, click sullo sfondo chiude. */
export const dsGestionaleModalBodyStage =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-md:min-h-0 md:items-center md:justify-center md:overflow-y-auto md:px-4 md:pb-[max(1rem,env(safe-area-inset-bottom))]";

/** Finestra modale lavorazioni (header + corpo): mobile fullscreen, desktop card centrata. */
export const dsLavorazioniModalDialog =
  `${cabModalDialogBase} max-md:min-w-0 max-w-full overflow-x-hidden w-full md:w-auto flex flex-col overflow-hidden max-md:flex-1 max-md:min-h-0 max-md:max-h-[min(100dvh,calc(var(--cab-vv-height,100dvh)))] max-md:rounded-none max-md:border-0 max-md:shadow-none md:flex-none md:max-h-[min(calc(92dvh-2rem),840px)] md:rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} md:shadow-2xl`;

/** Hub compatto (desktop): finestra più bassa (es. pulsante Informazioni). */
export const dsLavorazioniModalDialogCompact =
  `${cabModalDialogBase} max-md:min-w-0 max-w-full overflow-x-hidden w-full md:w-auto flex flex-col overflow-hidden max-md:flex-1 max-md:min-h-0 max-md:max-h-[min(100dvh,calc(var(--cab-vv-height,100dvh)))] max-md:rounded-none max-md:border-0 max-md:shadow-none md:flex-none md:max-h-[min(72dvh,560px)] md:rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} md:shadow-2xl`;

/** Analytics / report (desktop): finestra più alta. */
export const dsLavorazioniModalDialogTall =
  `${cabModalDialogBase} max-md:min-w-0 max-w-full overflow-x-hidden w-full md:w-auto flex flex-col overflow-hidden max-md:flex-1 max-md:min-h-0 max-md:max-h-[min(100dvh,calc(var(--cab-vv-height,100dvh)))] max-md:rounded-none max-md:border-0 max-md:shadow-none md:flex-none md:max-h-[min(92dvh,920px)] md:rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} md:shadow-2xl`;

/** @deprecated Liste dense: `GlobalTableHead sticky` + `globalTableTheadSticky`. */
export const dsTableThSticky =
  "sticky top-0 z-[2] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_96%,transparent)] shadow-[inset_0_-1px_0_0_var(--cab-border)] backdrop-blur-sm";

/** Riga tabella con alternanza leggera (optional, dopo `dsTableRow`). */
export const dsTableRowZebra = "even:bg-[color:color-mix(in_srgb,var(--cab-surface-2)_28%,var(--cab-card))]";

/** Z-index layer (coerenza stacking). */
/** @deprecated Non usare per toolbar liste — alias di `dsPageToolbar` (scorre col contenuto). */
export const dsZStickyToolbar = "z-[5]";
export const dsZHeader = "z-30";
export const dsZDrawer = "z-[55]";
export const dsZModal = "z-50";
export const dsZModalHigh = "z-[100]";
/** Menu filtri / autocomplete / calendario (portal su body). */
export const dsZDropdown = "z-[130]";
/** Tooltip icon-only (sopra dropdown, sotto toast). */
export const dsZTooltip = "z-[140]";
/** Overlay loading globale (sotto toast, sopra modali standard). */
export const dsZGlobalLoading = "z-[170]";
export const dsZToast = "z-[200]";

/** Stack toast (basso a destra). */
export const dsToastViewport =
  "pointer-events-none fixed bottom-0 right-0 flex max-h-[min(50dvh,24rem)] w-full max-w-[min(100%,24rem)] flex-col-reverse overflow-hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]";

/** Singola notifica toast — tono via classi aggiuntive (bordo + sfondo). */
export const dsToastItem =
  "pointer-events-auto flex items-center gap-3 rounded-[var(--ds-radius-xl)] border py-2.5 pl-3 pr-2 shadow-[var(--cab-shadow-md)] backdrop-blur-[2px]";

export const dsToastIconWrap =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)]";

export const dsToastMessage =
  "min-w-0 flex-1 self-center text-sm font-medium leading-snug text-[color:var(--cab-text)]";

export const dsToastDismiss =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--ds-radius-md)] text-[color:var(--cab-text-muted)] transition-[background-color,color] duration-150 hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]";

/** Contenuto tooltip portal (icon-only actions). */
export const dsTooltipContent =
  "pointer-events-none max-w-[12rem] whitespace-nowrap rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2 py-1.5 text-xs font-medium text-[color:var(--cab-text)] shadow-[var(--cab-shadow-md)] transition-[opacity,transform] duration-150 ease-out";

/** Tooltip multilinea (es. celle timesheet). */
export const dsTooltipContentMultiline =
  "pointer-events-none max-w-[14rem] whitespace-pre-line text-center leading-snug rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2.5 py-1.5 text-xs font-medium text-[color:var(--cab-text)] shadow-[var(--cab-shadow-md)] transition-[opacity,transform] duration-150 ease-out";

/** Skeleton */
export const dsSkeletonPulse =
  "animate-pulse rounded-md bg-[color:color-mix(in_srgb,var(--cab-text-muted)_14%,var(--cab-surface-2))]";
export const dsSkeletonLine = `h-4 w-full max-w-md ${dsSkeletonPulse}`;
export const dsSkeletonBlock = `h-24 w-full ${dsSkeletonPulse}`;

/** J — Badge semantici */
export const dsBadgeNeutral = `rounded-full bg-[color:color-mix(in_srgb,var(--cab-text-muted)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase ${cabText}`;
export const dsBadgeWarn = `rounded-full bg-[color:color-mix(in_srgb,var(--cab-warning)_18%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:color-mix(in_srgb,var(--cab-warning)_85%,var(--cab-text))]`;
export const dsBadgeDanger = `rounded-full bg-[color:color-mix(in_srgb,var(--cab-danger)_18%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]`;
export const dsBadgeOk = `rounded-full bg-[color:color-mix(in_srgb,var(--cab-success)_18%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:color-mix(in_srgb,var(--cab-success)_88%,var(--cab-text))]`;
export const dsBadgeInfo = `rounded-full bg-[color:color-mix(in_srgb,var(--cab-info)_18%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:color-mix(in_srgb,var(--cab-info)_88%,var(--cab-text))]`;

/** Tabs segmentati */
export const dsSegmentedWrap = `flex flex-wrap gap-1 rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabSurface} p-1 shadow-[var(--cab-shadow-sm)]`;
export const dsSegmentedBtnOn = `rounded-[var(--ds-radius-lg)] ${cabPrimaryBg} px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors`;
export const dsSegmentedBtnOff = `rounded-[var(--ds-radius-lg)] px-3 py-2 text-sm font-medium ${cabTextMuted} transition-colors hover:bg-[var(--cab-hover)]`;

export { dsScrollbar, dsScrollY, dsScrollPanel, dsScrollX } from "@/lib/ui/scroll-system";

/** L — Tipografia */
export const dsTypoPageTitle = `text-xl font-semibold tracking-tight ${cabText} md:text-2xl`;
export const dsTypoSectionTitle = `text-base font-semibold tracking-tight ${cabText}`;
export const dsTypoCardTitle = `text-sm font-semibold ${cabText}`;
export const dsTypoTableHeader = `text-[10px] font-semibold uppercase tracking-wide ${cabTextMuted}`;
export const dsTypoBody = `text-sm leading-relaxed ${cabText}`;
export const dsTypoSmall = `text-xs leading-snug ${cabTextMuted}`;
export const dsTypoCaption = `text-[11px] leading-snug ${cabTextMuted}`;

/** Titolo sezione widget dashboard (Lavorazioni, Magazzino, navigazione rapida, …). */
export const dsDashboardWidgetTitle = `${dsTypoSmall} font-bold uppercase tracking-wide text-[color:var(--cab-primary)]`;

/** @deprecated alias — usare `dsTypoPageTitle` */
export const dsPageTitle = dsTypoPageTitle;

/** Allineamento titolo header con azioni (esclude discendenti dal box di layout). */
export const dsPageTitleToolbarAlign = "cab-page-title-box";
export const dsPageDesc = `mt-1 max-w-2xl ${dsTypoSmall}`;

/**
 * Contenitore header pagina: padding verticale simmetrico sopra titolo e sotto (prima del bordo).
 */
export const dsPageHeaderShell =
  "mb-[length:var(--ds-space-lg)] min-w-0 max-w-full border-b border-[color:var(--cab-border)] pt-[length:var(--ds-space-md)] pb-[length:var(--ds-space-md)] sm:mb-[length:var(--ds-space-xl)] sm:pt-[length:var(--ds-space-lg)] sm:pb-[length:var(--ds-space-lg)]";

/**
 * Riga titolo + azioni header: stessa riga e allineamento verticale su tutti i breakpoint;
 * wrap da sm quando lo spazio non basta; titolo troncato su mobile stretto.
 */
export const dsPageHeaderTopRow =
  "flex min-w-0 max-w-full flex-row flex-nowrap items-center gap-x-2 gap-y-2 max-sm:gap-1.5 sm:flex-wrap sm:gap-x-[length:var(--ds-space-sm)] [&_.cab-page-title-box]:min-w-0 [&_.cab-page-title-box]:max-sm:truncate";

/** @deprecated alias — usare `dsPageHeaderTopRow` */
export const dsPageHeaderGrid = dsPageHeaderTopRow;

export const dsLabel = dsTypoSmall + " font-medium";

/** I — Header modale gestionale full-bleed (barra app sopra il pannello). */
export const dsModalHeader =
  "flex w-full shrink-0 self-stretch border-b border-[color:var(--cab-border)] bg-[var(--cab-card)] px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] shadow-[inset_0_-1px_0_0_var(--cab-border)] sm:py-3";

/** Header dentro finestra desktop (angoli superiori arrotondati, no safe-area sheet). */
export const dsLavorazioniModalWindowHeader =
  `${dsModalHeader} md:rounded-t-[var(--ds-radius-xl)] md:px-4 md:py-3 md:pt-3 md:shadow-none`;

export const dsModalHeaderInner = "flex w-full min-w-0 items-center justify-between gap-3";

export const dsModalHeaderLead = "flex min-w-0 flex-1 items-center gap-2";

export const dsModalTitleBlock = "min-w-0 flex-1";

export const dsModalTitle = `truncate text-base font-semibold leading-tight tracking-tight ${cabText} sm:text-lg`;

export const dsModalSubtitle = `mt-0.5 truncate ${dsTypoCaption}`;

export const dsModalCloseBtn = "h-11 w-11 shrink-0 sm:h-9 sm:w-9";

export const dsModalBackBtn = `${dsPageToolbarBtn} h-9 shrink-0 px-2.5 text-xs sm:px-3`;

/** Alias espliciti sezione / card */
export const dsSectionTitle = dsTypoSectionTitle;
export const dsCardTitle = dsTypoCardTitle;

/** Stack verticale sotto `PageHeader` — include contenimento responsive (ResponsiveLayoutCore). */
export const dsStackPage = layoutPageContainer;

/** Larghezza contenuto pagine gestionale — full bleed nella colonna main (dopo sidebar). */
export const dsGestionaleContentMax = "w-full min-w-0 max-w-full";

/** Padding orizzontale contenuto (wrapper interno; il main scroll resta edge-to-edge). */
export const dsGestionaleContentGutter = "px-5";

/** Riga shell header allineata al wrapper contenuto (stessa larghezza utile + gutter). */
export const dsGestionaleContentShellRow = `${dsGestionaleContentMax} w-full min-w-0`;

/** Rail scroll strutturale: full width colonna main, senza max-width né padding (scrollbar a destra). */
export const dsGestionaleContentRail = "flex min-h-0 min-w-0 w-full flex-1 flex-col";

/** Placeholder unificato campi ricerca liste; dettaglio in `aria-label` per modulo. */
export const GESTIONALE_SEARCH_PLACEHOLDER = "Cerca…";

/** Shell toolbar pagina — unico token per liste (scorre col contenuto, no sticky). */
export const dsPageToolbar = `relative min-w-0 max-w-full rounded-[var(--ds-radius-xl)] ${cabBorder} bg-[color:color-mix(in_srgb,var(--cab-surface-2)_94%,transparent)] p-[length:var(--ds-space-md)] shadow-[var(--cab-shadow-sm)] backdrop-blur-md sm:p-[length:var(--ds-space-lg)]`;

/** Chip meta riga toolbar (conteggio, filtri attivi) — compatto, allineato a `dsPageToolbarBtn`. */
export const dsPageToolbarMetaChipBase =
  "inline-flex min-h-[1.5rem] items-center gap-1 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] px-2 py-0.5 text-xs leading-none shadow-[var(--cab-shadow-sm)]";
export const dsPageToolbarMetaChip = `${dsPageToolbarMetaChipBase} bg-[var(--cab-surface)] text-[color:var(--cab-text-muted)]`;
export const dsPageToolbarMetaChipAccent = `${dsPageToolbarMetaChipBase} border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] font-semibold text-[color:var(--cab-text)]`;
export const dsPageToolbarMetaActionBtn = `inline-flex min-h-[1.75rem] shrink-0 items-center justify-center gap-1 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] px-2.5 py-1 text-xs font-semibold text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)] transition-[background-color,border-color,box-shadow,color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_58%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-surface))] hover:shadow-[var(--cab-shadow-md)] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;
/** @deprecated Usare `dsPageToolbarMetaActionBtn`. */
export const dsPageToolbarMetaResetBtn = dsPageToolbarMetaActionBtn;

/** @deprecated Alias di `dsPageToolbar` — sticky rimosso; usare `dsPageToolbar`. */
export const dsStickyToolbar = dsPageToolbar;

/** Hub modals (dettaglio lavorazione, mezzo, …) — tab bar + sezioni read-only. */
export const dsHubModalTabBar =
  "flex shrink-0 flex-wrap gap-1.5 border-b border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 py-2";
export const dsHubModalTabBtnOn =
  "border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_15%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))]";
export const dsHubModalTabBtnOff = `border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))] text-[color:var(--cab-text-muted)] hover:border-[color:var(--cab-border-strong)] hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]`;
export const dsHubModalTabBtnBase =
  "inline-flex min-h-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border px-3 py-2 text-xs font-semibold transition-colors sm:min-h-9";
export const dsHubModalMetaChip = `${dsPageToolbarMetaChipBase} bg-[color:color-mix(in_srgb,var(--cab-surface-2)_80%,var(--cab-card))] font-semibold text-[color:var(--cab-text)]`;
export const dsHubModalSection =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-2.5 py-2 shadow-[var(--cab-shadow-sm)]";
/** Card annidata in hub modals (slot documenti, foto, righe archivio). */
export const dsHubModalNestedCard =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))] px-3 py-2.5";
export const dsHubModalSectionTitle =
  "text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-primary)]";
export const dsHubModalFieldLabel =
  "text-[9px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]";
export const dsHubModalFieldValue =
  "mt-0.5 text-xs font-semibold leading-tight text-[color:var(--cab-text)]";
export const dsHubModalFieldValueEmpty =
  "mt-0.5 text-xs font-medium leading-tight text-[color:var(--cab-text-muted)]";

/** Schede info read-only (magazzino, hub Panoramica): card + righe label/valore. */
export const dsGestionaleInfoCard =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))] p-3 shadow-[var(--cab-shadow-sm)]";
/** Variante compatta (hub schede): stesso stile, padding ridotto. */
export const dsGestionaleInfoCardCompact =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))] px-2.5 py-2 shadow-[var(--cab-shadow-sm)]";
export const dsGestionaleInfoCardTitle =
  "text-xs font-bold uppercase tracking-wide text-[color:var(--cab-text)]";
export const dsGestionaleInfoCardSubgroup =
  "mt-4 border-t border-[color:var(--cab-border)] pt-3.5";
export const dsGestionaleInfoCardSubgroupTitle =
  "mb-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]";
export const dsGestionaleInfoCardRow =
  "grid grid-cols-[minmax(7rem,128px)_1fr] gap-2 border-b border-[color:var(--cab-border)] py-2 text-sm last:border-b-0";
/** Portale / modali strette: label sopra valore, larghezza testo stabile. */
export const dsGestionaleInfoCardRowStacked =
  "flex flex-col gap-0.5 border-b border-[color:var(--cab-border)] py-2 text-sm last:border-b-0";
export const dsGestionaleInfoCardRowLabel =
  "font-medium text-[color:var(--cab-text-muted)]";
export const dsGestionaleInfoCardRowValue = "min-w-0 text-[color:var(--cab-text)]";
export const dsGestionaleInfoCardRowValueStrong =
  "min-w-0 font-medium text-[color:var(--cab-text)]";
export const dsGestionaleInfoCardMetricRow =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[color:var(--cab-border)] py-2 text-sm last:border-b-0";

/** Layout tab Panoramica hub modals — pannello, riepilogo KPI, sottosezioni. */
export const dsHubModalPanoramicaPanel = "flex flex-col gap-5 text-sm";
/** @deprecated Preferire `dsHubModalFieldLabel`. */
export const dsHubModalPanoramicaKpiLabel = dsHubModalFieldLabel;
export const dsHubModalPanoramicaFieldTiles = "grid gap-2 sm:grid-cols-2";
/** @deprecated Alias di `dsHubModalPanoramicaFieldTiles` — KPI come tile individuali. */
export const dsHubModalPanoramicaKpiGrid = dsHubModalPanoramicaFieldTiles;
export const dsHubModalPanoramicaFieldTile =
  "min-w-0 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] p-3";
/** @deprecated Preferire `HubModalPanoramicaKpiGrid` — riepilogo pillole compatto legacy. */
export const dsHubModalPanoramicaSummary =
  "grid grid-cols-2 gap-x-3 gap-y-2 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] p-2.5 sm:grid-cols-3";
export const dsHubModalPanoramicaSummaryItem = "flex min-w-0 flex-col gap-0.5";
export const dsHubModalPanoramicaSubsection =
  "border-t border-[color:var(--cab-border)] pt-2.5 first:border-t-0 first:pt-0";
export const dsHubModalPanoramicaSubsectionTitle =
  "mb-1.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--cab-text-muted)]";
export const dsHubModalPanoramicaFieldGrid =
  "grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-3";
export const dsHubModalPanoramicaNoteBody =
  "rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_88%,var(--cab-card))] px-2.5 py-2 text-xs leading-snug";
export const dsHubModalPanoramicaReadonlyPill =
  "relative inline-flex w-fit max-w-full min-w-0 items-center overflow-hidden rounded-lg border border-black/10 shadow-sm shadow-black/12 dark:border-white/10";
export const dsHubModalPanoramicaReadonlyPillInner =
  "pointer-events-none flex min-h-7 min-w-0 items-center truncate px-2.5 text-[11px] font-semibold leading-tight tracking-wide text-inherit";

/** Spacing utility (gap / padding) */
export const dsGapXs = "gap-[length:var(--ds-space-xs)]";
export const dsGapSm = "gap-[length:var(--ds-space-sm)]";
export const dsGapMd = "gap-[length:var(--ds-space-md)]";
export const dsGapLg = "gap-[length:var(--ds-space-lg)]";
export const dsGapXl = "gap-[length:var(--ds-space-xl)]";
export const dsGap2xl = "gap-[length:var(--ds-space-2xl)]";
export const dsPadPage = "p-[length:var(--ds-space-lg)] md:p-[length:var(--ds-space-xl)]";

export const selectPillInner =
  "lavorazioni-select-dk flex min-h-8 w-full min-w-0 flex-1 cursor-pointer appearance-none items-center truncate bg-transparent py-1 pl-2 pr-8 text-[11px] font-semibold leading-tight tracking-wide text-inherit outline-none transition-[background-color,color] duration-150 hover:bg-white/[0.06] focus-visible:outline-none rounded-[inherit]";

/** Pill tabella (Stato / Priorità / Addetto): testo centrato, padding simmetrico per il chevron. */
export const selectPillInnerTable =
  "lavorazioni-select-dk flex min-h-8 w-full min-w-0 flex-1 cursor-pointer appearance-none items-center whitespace-nowrap bg-transparent py-1 pl-8 pr-8 text-center text-[13px] font-medium leading-tight tracking-wide text-inherit outline-none transition-[background-color,color] duration-150 hover:bg-white/[0.06] focus-visible:outline-none rounded-[inherit]";
