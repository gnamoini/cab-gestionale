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
 * K — Scrollbar: `gestionale-scrollbar` (globals) + `dsScrollbar`
 * L — Tipografia: `dsTypoPageTitle`, `dsSectionTitle`, …
 * M — Z-index / layer: `dsZHeader`, `dsZDrawer`, `dsZModal`, `dsZModalHigh`, `dsZToast`
 * N — Skeleton: `dsSkeletonLine`, `dsSkeletonBlock`
 */

import {
  globalTableEmptyCell,
  globalTableRow,
  globalTableWrap,
} from "@/lib/ui/global-table";

const cabText = "text-[color:var(--cab-text)]";
const cabTextMuted = "text-[color:var(--cab-text-muted)]";
const cabBorder = "border-[color:var(--cab-border)]";
const cabSurface = "bg-[var(--cab-surface)]";
const cabCard = "bg-[var(--cab-card)]";

/** Focus ring e micro-feedback click — usare su tutti i controlli interattivi. */
export const dsFocus =
  "outline-none transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--cab-primary)_42%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--cab-bg-app)] dark:focus-visible:ring-offset-[var(--cab-bg-app)]";

export const dsDisabled = "disabled:pointer-events-none disabled:opacity-55 disabled:cursor-not-allowed";

/** Cursore manina su controlli cliccabili (bottoni design system). */
const dsBtnCursor = "cursor-pointer";

/** D — Neutro: Chiudi, Annulla, azioni discrete */
export const dsBtnNeutral = `inline-flex items-center justify-center gap-1.5 rounded-[var(--ds-radius-lg)] ${cabBorder} ${cabSurface} px-2.5 py-2 text-xs font-medium ${cabText} shadow-[var(--cab-shadow-sm)] hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)] hover:ring-1 hover:ring-[color:color-mix(in_srgb,var(--cab-border)_75%,transparent)] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

/** Toolbar intestazione pagina */
export const dsPageToolbarBtn = `inline-flex min-h-[2.5rem] shrink-0 items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] ${cabSurface} px-3 py-2 text-xs font-semibold ${cabText} shadow-[var(--cab-shadow-sm)] transition-[background-color,box-shadow,ring-color,border-color,color] duration-200 ease-out hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)] hover:ring-1 hover:ring-[color:color-mix(in_srgb,var(--cab-border-strong)_70%,transparent)] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

export const dsBtnSettings = dsPageToolbarBtn;

/** A — Primario */
export const dsBtnPrimary = `inline-flex items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_30%,var(--cab-border))] bg-[var(--cab-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--cab-shadow-sm)] hover:brightness-[1.06] hover:shadow-[var(--cab-shadow-md)] hover:ring-2 hover:ring-[color:color-mix(in_srgb,var(--cab-primary)_35%,transparent)] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

/** A — CTA hero */
export const dsBtnCtaHero = `inline-flex items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-primary)_45%,transparent)] bg-gradient-to-b from-[var(--cab-primary)] to-[color:color-mix(in_srgb,var(--cab-primary)_82%,#000)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--cab-shadow-md)] transition-[transform,box-shadow,filter] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:brightness-[1.03] active:translate-y-0 active:brightness-[0.98] ${dsBtnCursor} ${dsFocus} ${dsDisabled}`;

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
export const dsInput = `w-full rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] ${cabSurface} px-3 py-2.5 text-sm ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[color:var(--cab-text-muted)] hover:border-[color:var(--cab-border-strong)] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${dsFocus}`;

/** F — Campo ricerca toolbar (icona a sinistra, `min-h-11`, stessi token di `dsInput`). */
export const dsSearchFieldInput = `w-full min-h-11 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] ${cabSurface} py-0 pl-10 pr-3 text-sm ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[color:var(--cab-text-muted)] hover:border-[color:var(--cab-border-strong)] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${dsFocus}`;

export const dsTextarea = `${dsInput} min-h-[5.5rem] resize-y`;

/** F — Checkbox nativo (login, footer modali, form gestionale). */
export const dsCheckboxInput =
  "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[color:var(--cab-border-strong)] text-[var(--cab-primary)] shadow-[var(--cab-shadow-sm)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_30%,transparent)] disabled:cursor-not-allowed disabled:opacity-50";

/** F — Opzione checkbox in card (footer modali, toggle secondari). */
export const dsCheckboxOptionLabel = `flex min-w-0 cursor-pointer items-start gap-3 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} px-3 py-2.5 text-left shadow-[var(--cab-shadow-sm)] transition-[border-color,background-color,box-shadow] duration-150 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[var(--cab-hover)] hover:shadow-[var(--cab-shadow-md)] has-[:checked]:border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] has-[:checked]:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] has-[:checked]:shadow-[var(--cab-shadow-md)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55`;

/** I — Footer form modale (checkbox opzionale + azioni). */
export const dsModalFormFooter =
  "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[color:var(--cab-border)] bg-[var(--cab-card)] px-4 py-3";

export const dsInputAuth = `w-full rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border-strong)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_90%,#000)] px-3 py-2.5 text-sm text-[color:var(--cab-text)] shadow-md shadow-black/20 outline-none ring-[color:color-mix(in_srgb,var(--cab-primary)_18%,transparent)] placeholder:text-[color:var(--cab-text-muted)] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_50%,var(--cab-border))] focus:ring-2 ${dsFocus} ${dsDisabled}`;

/** E — Chevron select */
const selectChevronWhite =
  "bg-[length:1.15rem] bg-[right_0.55rem_center] bg-no-repeat bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f4f4f5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.25' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]";

/** Chevron accent filtri — stesso stroke (#f97316) in light e dark (allineato alla light). */
const gestionaleSelectChevronAccent =
  "bg-[length:1.1rem] bg-[right_0.55rem_center] bg-no-repeat bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f97316'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.25' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]";

export const selectLavorazioniInline =
  `lavorazioni-select-dk min-w-0 max-w-[11rem] h-10 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border-strong)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_92%,#000)] py-2 pl-7 pr-8 text-xs font-medium text-[color:var(--cab-text)] shadow-md shadow-black/25 outline-none transition-all duration-200 ease-out hover:border-[color:var(--cab-border)] hover:brightness-[1.05] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_30%,transparent)] ${selectChevronWhite}`;

export const gestionaleSelectFilterClass =
  `min-h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} py-2.5 pl-9 pr-10 text-sm font-semibold leading-snug ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${gestionaleSelectChevronAccent}`;

/** Pulsante / toggle filtro in riga con i select `gestionaleSelectFilterClass` (stessa altezza, raggio, peso tipografico). */
export const gestionaleFilterChipClass =
  `inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} px-3 py-2.5 text-sm font-semibold leading-snug ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${dsFocus}`;

export const selectLavorazioniFilter = gestionaleSelectFilterClass;

export const gestionaleSelectNativePlainClass =
  `min-h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] ${cabSurface} py-2.5 pl-3 pr-10 text-sm font-semibold leading-snug ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)] ${gestionaleSelectChevronAccent}`;

export const lavorazioniModalSelectClass =
  `min-h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[var(--ds-radius-lg)] ${cabBorder} ${cabSurface} py-2.5 pl-3 pr-10 text-sm font-medium leading-snug ${cabText} shadow-[var(--cab-shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] focus:border-[color:color-mix(in_srgb,var(--cab-primary)_50%,var(--cab-border))] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_22%,transparent)]`;

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
export const dsTableHead = `bg-[var(--cab-surface-2)] text-[10px] font-semibold uppercase tracking-wide ${cabTextMuted}`;

/** Riga corpo tabella standard (alias token globale) */
export const dsTableRow = globalTableRow;

/** @deprecated Preferire `GlobalTableSortTh` da `@/components/gestionale/global-table`. */
export const dsTableSortTh = `border-b ${cabBorder} bg-[var(--cab-surface-2)] px-2.5 py-2 align-middle text-xs font-semibold uppercase tracking-wide`;

/** Celle `<th>` statiche (header tabella modali / report) */
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
export const dsTableActionsRowHeight = "h-9 min-h-9 max-h-9";

/** G — Gruppo pulsanti azione tabella (preset ufficiale Lavorazioni). */
export const dsTableActionsGroup =
  `inline-flex ${dsTableActionsRowHeight} w-max max-w-none flex-nowrap items-stretch justify-center gap-1`;

/** Gruppo azioni allineato a destra (card mobile / toolbar). */
export const dsTableActionsGroupEnd =
  `inline-flex ${dsTableActionsRowHeight} w-max max-w-none flex-nowrap items-stretch justify-end gap-1`;

/** Gruppo azioni allineato a sinistra (toolbar secondaria). */
export const dsTableActionsGroupStart =
  `inline-flex ${dsTableActionsRowHeight} w-max max-w-none flex-nowrap items-stretch justify-start gap-1`;

/** Footer azioni card mobile: wrap, stesso `gap-1` / `items-stretch` del gruppo tabella. */
export const dsCardMobileActionsGroup =
  "inline-flex max-w-full min-w-0 flex-wrap items-stretch justify-end gap-1";

/** Shell card stack sotto breakpoint `md` (contenuto + footer azioni). */
export const dsCardMobileShell =
  "flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90";

/** G — Icone outline nelle azioni tabella (24×24, stroke 2). */
export const dsTableActionGlyph = "h-4 w-4 shrink-0 opacity-90";

const dsTableActionSqBase =
  `inline-flex ${dsTableActionsRowHeight} w-9 min-w-9 shrink-0 items-center justify-center rounded-lg border-2 p-0 shadow-[var(--cab-shadow-sm)] outline-none transition-[background-color,border-color,box-shadow,color,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed box-border ${dsBtnCursor} ${dsFocus}`;

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

/** H — Card statica */
export const dsSurfaceCard = `rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} shadow-[var(--cab-shadow-sm)]`;

export const dsSurfacePanel = `flex min-h-[220px] flex-col rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabSurface} p-4 shadow-[var(--cab-shadow-sm)] transition-all duration-200 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] hover:shadow-[var(--cab-shadow-md)] ${dsFocus}`;

export const dsSurfaceInteractiveKpi = `group flex h-full min-h-[220px] flex-col rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabSurface} p-4 text-left shadow-[var(--cab-shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_22%,var(--cab-border))] hover:shadow-[var(--cab-shadow-md)] active:scale-[0.99] ${dsFocus}`;

/** Tile interna navigazione rapida (dentro `dsSurfaceCard` principale). */
export const dsSurfaceQuickNavTile = `group flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-[var(--ds-radius-xl)] border px-3 py-3.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] hover:shadow-[var(--cab-shadow-md)] active:scale-[0.98] border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_55%,var(--cab-card))] text-[color:var(--cab-text)]`;

/** Tile disabilitata (staging) — stesso layout centrato della quick nav. */
export const dsSurfaceQuickNavTileDisabled = `group flex min-h-[5.5rem] cursor-not-allowed flex-col items-center justify-center gap-2 rounded-[var(--ds-radius-xl)] border border-dashed px-3 py-3.5 text-center opacity-70 ${cabBorder}`;

export const dsModalBackdrop =
  "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[var(--cab-overlay)] p-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[2px]";

export const dsModalPanel = `w-full max-w-lg rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} p-4 shadow-[var(--cab-shadow-md)]`;

/** Modali Lavorazioni (sopra altri layer; stesso overlay/click-outside del `Modal` globale). */
export const dsLavorazioniModalLayer =
  "fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[var(--cab-overlay)] p-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[2px]";
/** @deprecated — overlay integrato in `dsLavorazioniModalLayer`; non usare più. */
export const dsLavorazioniModalOverlay = "hidden";
export const dsLavorazioniModalDialog =
  `relative z-[1] flex max-h-[calc(100dvh-1.5rem)] w-full min-h-0 flex-col overflow-hidden rounded-[var(--ds-radius-xl)] ${cabBorder} ${cabCard} shadow-2xl sm:max-h-[min(92dvh,920px)]`;

/** `<th>` sticky per tabelle principali (Preventivi / Lavorazioni / …). */
export const dsTableThSticky =
  "sticky top-0 z-[2] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_96%,transparent)] shadow-[inset_0_-1px_0_0_var(--cab-border)] backdrop-blur-sm";

/** Riga tabella con alternanza leggera (optional, dopo `dsTableRow`). */
export const dsTableRowZebra = "even:bg-[color:color-mix(in_srgb,var(--cab-surface-2)_28%,var(--cab-card))]";

/** Z-index layer (coerenza stacking). */
export const dsZStickyToolbar = "z-[5]";
export const dsZHeader = "z-30";
export const dsZDrawer = "z-[55]";
export const dsZModal = "z-50";
export const dsZModalHigh = "z-[100]";
/** Menu filtri / autocomplete / calendario (portal su body). */
export const dsZDropdown = "z-[130]";
/** Tooltip icon-only (sopra dropdown, sotto toast). */
export const dsZTooltip = "z-[140]";
export const dsZToast = "z-[200]";

/** Contenuto tooltip portal (icon-only actions). */
export const dsTooltipContent =
  "pointer-events-none max-w-[12rem] whitespace-nowrap rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-2 py-1.5 text-xs font-medium text-[color:var(--cab-text)] shadow-[var(--cab-shadow-md)] transition-[opacity,transform] duration-150 ease-out";

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
export const dsSegmentedBtnOn = `rounded-[var(--ds-radius-lg)] bg-[var(--cab-primary)] px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors`;
export const dsSegmentedBtnOff = `rounded-[var(--ds-radius-lg)] px-3 py-2 text-sm font-medium ${cabTextMuted} transition-colors hover:bg-[var(--cab-hover)]`;

export const dsScrollbar = "gestionale-scrollbar";

/** L — Tipografia */
export const dsTypoPageTitle = `text-xl font-semibold tracking-tight ${cabText} md:text-2xl`;
export const dsTypoSectionTitle = `text-base font-semibold tracking-tight ${cabText}`;
export const dsTypoCardTitle = `text-sm font-semibold ${cabText}`;
export const dsTypoTableHeader = `text-[10px] font-semibold uppercase tracking-wide ${cabTextMuted}`;
export const dsTypoBody = `text-sm leading-relaxed ${cabText}`;
export const dsTypoSmall = `text-xs leading-snug ${cabTextMuted}`;
export const dsTypoCaption = `text-[11px] leading-snug ${cabTextMuted}`;

/** @deprecated alias — usare `dsTypoPageTitle` */
export const dsPageTitle = dsTypoPageTitle;

/** Allineamento titolo header con azioni (esclude discendenti dal box di layout). */
export const dsPageTitleToolbarAlign = "cab-page-title-box";
export const dsPageDesc = `mt-1 max-w-2xl ${dsTypoSmall}`;

/**
 * Riga titolo + azioni header: stessa riga su desktop; wrap automatico quando lo spazio non basta
 * (azioni sotto il titolo, mai sovrapposte).
 */
export const dsPageHeaderTopRow =
  "flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-[length:var(--ds-space-lg)] sm:gap-y-3";

/** @deprecated alias — usare `dsPageHeaderTopRow` */
export const dsPageHeaderGrid = dsPageHeaderTopRow;

export const dsLabel = dsTypoSmall + " font-medium";

/** Alias espliciti sezione / card */
export const dsSectionTitle = dsTypoSectionTitle;
export const dsCardTitle = dsTypoCardTitle;

/** Stack verticale sotto `PageHeader` */
export const dsStackPage = "space-y-[length:var(--ds-space-xl)]";

/** Larghezza massima contenuto liste gestionale (allineata tra moduli). */
export const dsGestionaleContentMax = "mx-auto w-full max-w-[min(100%,100rem)]";

/** Placeholder unificato campi ricerca liste; dettaglio in `aria-label` per modulo. */
export const GESTIONALE_SEARCH_PLACEHOLDER = "Cerca…";

/** Toolbar sticky interna */
export const dsStickyToolbar = `sticky top-0 z-[5] rounded-[var(--ds-radius-xl)] ${cabBorder} bg-[color:color-mix(in_srgb,var(--cab-surface-2)_94%,transparent)] p-[length:var(--ds-space-md)] shadow-[var(--cab-shadow-sm)] backdrop-blur-md sm:p-[length:var(--ds-space-lg)]`;

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
