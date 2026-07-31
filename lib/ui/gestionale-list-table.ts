/**
 * DESIGN MASTER — tabella pagina Lavorazioni (`lavorazioni-view.tsx`).
 *
 * Tutte le liste gestionale con struttura simile (Clienti, Preventivi, Magazzino, …)
 * devono derivare da questi token e da `<GestionaleListTable>` — non duplicare classi locali.
 *
 * ## Table header standard (liste dense)
 *
 * | Elemento | Token / componente |
 * |----------|-------------------|
 * | `<thead>` | `globalTableTheadClass` (via `GlobalTableHead`) |
 * | `<th>` padding | `globalTableThCell` |
 * | Label statica | `globalTableThLabel` in `GlobalTableHeadLabel` |
 * | Sort | `GlobalTableSortTh` (unico sort header liste) |
 * | Edge inset riga head | `globalTableHeadEdgeInset` su `<tr>` |
 * | Body inset | `globalTableTbodyInset` su `<tbody>` |
 * | Colonna Azioni | `GestionaleListTableActionsHead` + `gestionaleListTableTdAzioni` + `gestionaleListTableActionsGroupEnd` |
 * | Sticky azioni | scope `gestionale-list-table-scope` in `gestionale-list-table.css` |
 *
 * ## Allineamento celle corpo
 *
 * - Testo: `gestionaleListTableTd`
 * - Date/numeri centrati: `gestionaleListTableTdCenter`
 * - Pill (stato, priorità): `gestionaleListTableTdPill`
 * - Azioni: `gestionaleListTableTdAzioni` + `gestionaleListTableActionsGroupEnd`
 *
 * Checklist nuova tabella:
 * - Shell: `GestionaleListTable` (+ `visibilityClass` se c’è card mobile)
 * - Righe: `gestionaleListTableRowClass`
 * - Header sort: `GlobalTableSortTh` (mai titoli su due righe salvo eccezione documentata)
 * - Titoli: una riga, `whitespace-nowrap` (già in `GlobalTableHeadLabel` / `GlobalTableSortTh`)
 */
import type { CSSProperties } from "react";
import { dsScrollbar } from "@/lib/ui/design-system";
import {
  globalTableBase,
  globalTableEmptyCell,
  globalTableFixed,
  globalTableHeadEdgeInset,
  globalTableRow,
  globalTableTdActions,
  globalTableTdBody,
  globalTableTheadClass,
  globalTableTheadSticky,
  globalTableTbodyInset,
  globalTableWrap,
} from "@/lib/ui/global-table";
import {
  dsTableActionBadge,
  dsTableActionBtnDanger,
  dsTableActionBtnInfo,
  dsTableActionBtnPrimary,
  dsTableActionBtnSecondary,
  dsTableActionBtnWithBadge,
  dsTableActionsGroup,
  dsTableActionsGroupEnd,
  dsTableActionsRowHeight,
} from "@/lib/ui/design-system";

// —— Shell / contenitore (padding laterale via tbody inset, come Lavorazioni) ——

/** Card + scroll orizzontale — identico al wrap interno di `GlobalTable`. */
export const gestionaleListTableWrap = globalTableWrap;

/** Scrollbar + eventuale scope scroll pagina (es. modali lavorazioni). */
export const gestionaleListTableWrapClass = `${globalTableWrap} ${dsScrollbar}`;

/** Scope scroll + sticky azioni (vedi `gestionale-list-table.css`). Alias retrocompat: `lavorazioni-scroll-scope`. */
export const gestionaleListTableScrollScopeClass =
  "gestionale-list-table-scope lavorazioni-scroll-scope max-w-full min-w-0";

/**
 * Scope scroll/sticky azioni sul wrap tabella.
 * `GlobalTable` applica già `globalTableWrap` + scrollbar — non ripetere qui (evita doppio bordo/card).
 */
export const gestionaleListTableMasterWrapClass = gestionaleListTableScrollScopeClass;

/** Tabella densa Lavorazioni — scroll orizzontale sotto ~lg, colonne nascoste via CSS. */
export const gestionaleLavorazioniDenseTableClass = "gestionale-lavorazioni-dense-table";

/** Classe `<table>` — `table-fixed` + tipografia 13px. */
export const gestionaleListTableClass = globalTableFixed;

/** @deprecated Usare `gestionaleListTableClass`. */
export const gestionaleListTableFixedClass = gestionaleListTableClass;

// —— Header ——

export const gestionaleListTableTheadClass = globalTableTheadClass;
export const gestionaleListTableTheadStickyClass = globalTableTheadSticky;
export const gestionaleListTableHeadRowClass = globalTableHeadEdgeInset;
export const gestionaleListTableTbodyClass = globalTableTbodyInset;

// —— Righe ——

/** Hover, bordo riga — da `globalTableRow` / `dsTableRow`. */
export const gestionaleListTableRowBaseClass = globalTableRow;

/** Altezza e sfondo riga dati (master Lavorazioni). */
export const gestionaleListTableRowSurfaceClass = "h-14 bg-white dark:bg-zinc-900/40";

/** Classe completa `<tr>` lista standard. */
export const gestionaleListTableRowClass = `${gestionaleListTableRowBaseClass} ${gestionaleListTableRowSurfaceClass}`;

// —— Celle corpo ——

/** Padding e allineamento sinistro (`px-2 py-1`) — master Lavorazioni. */
export const gestionaleListTableTd = globalTableTdBody;

/** Celle centrate (date, numeri, identificativi mezzo). */
export const gestionaleListTableTdCenter =
  "box-border px-2 py-1 align-middle text-center text-xs font-medium tabular-nums text-zinc-800 dark:text-zinc-100";

/** Celle identificazione mezzo (targa / matricola / scuderia) — mono compatto. */
export const gestionaleListTableTdIdent =
  "gestionale-list-table-col-ident box-border px-2 py-1 align-middle text-center text-[13px] font-medium leading-tight tabular-nums text-zinc-900 dark:text-zinc-100";

/** Celle pill (stato, priorità, addetto) — stesso padding orizzontale delle altre celle. */
export const gestionaleListTableTdPill =
  "box-border overflow-hidden px-2 py-1 align-middle text-center";
/** Inset colonne Stato/Addetto — tabella densa Lavorazioni (`lavorazioni-scroll.css`). */
export const gestionaleListTableColStatoAddettoInsetClass =
  "gestionale-list-table-col-stato-addetto-inset";
/** Pill a tutta larghezza colonna (larghezza da `<col>` / colgroup). */
export const gestionaleListTableTdPillWrap = "box-border w-full min-w-0 max-w-full";

// —— Colonna Azioni (titolo a destra, sticky — stili in `lavorazioni-scroll.css`) ——

/** Solo layout sticky — sfondo allineato alla riga in `lavorazioni-scroll.css` (evita conflitti Tailwind su `<td>`). */
export const gestionaleListTableActionsCellClass = "gestionale-list-table-actions-cell";

export const gestionaleListTableActionsHeadClass = "gestionale-list-table-actions-head";

export const gestionaleListTableThAzioni = gestionaleListTableActionsHeadClass;

export const gestionaleListTableTdAzioni = gestionaleListTableActionsCellClass;

export const gestionaleListTableActionsGroup = dsTableActionsGroup;
export const gestionaleListTableActionsGroupEnd = dsTableActionsGroupEnd;
export const gestionaleListTableActionsRowHeight = dsTableActionsRowHeight;

export {
  dsTableActionBtnPrimary as gestionaleListTableActionBtnPrimary,
  dsTableActionBtnSecondary as gestionaleListTableActionBtnSecondary,
  dsTableActionBtnInfo as gestionaleListTableActionBtnInfo,
  dsTableActionBtnDanger as gestionaleListTableActionBtnDanger,
  dsTableActionBtnWithBadge as gestionaleListTableActionBtnWithBadge,
  dsTableActionBadge as gestionaleListTableActionBadge,
};

// —— Empty / mobile ——

export const gestionaleListTableEmptyCell = globalTableEmptyCell;

export const gestionaleListTableMobileEmptyClass =
  "rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400";

export const gestionaleListTableMobileStackClass = "mt-4 space-y-3 md:hidden";

// —— Larghezze colonne dati (preset Lavorazioni — riusare in portale clienti) ——

export const gestionaleListColIngressoClass = "w-[7rem]";
export const gestionaleListColCodiceClass = "w-[5.5%]";
export const gestionaleListColClienteClass = "w-[9%]";
export const gestionaleListColCantiereClass = "w-[5.5%]";
export const gestionaleListColAttrezzaturaClass = "w-[11%]";
/** @deprecated Sostituito da scuderia / targa / matricola. */
export const gestionaleListColIdentificazioneClass = "w-[10%]";
export const gestionaleListColScuderiaClass =
  "w-[3.25rem] min-w-[3.25rem] gestionale-list-table-col-ident";
export const gestionaleListColTargaClass =
  "w-[5.25rem] min-w-[5.25rem] gestionale-list-table-col-ident";
export const gestionaleListColMatricolaClass =
  "w-[6.25rem] min-w-[6.25rem] gestionale-list-table-col-ident";
export const gestionaleListColNoteClass = "w-[7%] gestionale-list-table-col-note";
export const gestionaleListColAzioniClass = "w-[11.5rem] min-w-[11.5rem]";

/** Utility: combina classi riga con stato highlight (navigazione da URL). */
export function gestionaleListTableRowClassNames(extra?: string): string {
  return [gestionaleListTableRowClass, extra].filter(Boolean).join(" ");
}

/**
 * Ultima riga visibile (liste virtualizzate: il tbody ha righe spacer dopo i dati).
 * Angoli inferiori in `gestionale-list-table.css`.
 */
export const gestionaleListTableLastRowAttr = "data-gestionale-last-row";

export function gestionaleListTableIsLastRow(index: number, rowCount: number): boolean {
  return rowCount > 0 && index === rowCount - 1;
}

/** Valori `data-gestionale-row-tone` — stili in `gestionale-list-table.css`. */
export const gestionaleListTableRowToneFlash = "flash" as const;
export const gestionaleListTableRowToneLowStock = "low-stock" as const;

export type GestionaleListTableRowTone =
  | typeof gestionaleListTableRowToneFlash
  | typeof gestionaleListTableRowToneLowStock;

/** Tone riga per flash realtime / sotto-scorta (priorità: low-stock > flash). */
export function gestionaleListTableRowTone(opts: {
  flash?: boolean;
  lowStock?: boolean;
}): GestionaleListTableRowTone | undefined {
  if (opts.lowStock) return gestionaleListTableRowToneLowStock;
  if (opts.flash) return gestionaleListTableRowToneFlash;
  return undefined;
}

const GESTIONALE_LIST_TABLE_PILL_COL_PAD_REM = 1;

function gestionaleListTablePillContentWidthRem(labels: readonly string[]): number {
  const maxLen = labels.reduce((m, l) => Math.max(m, l.trim().length), 0);
  return Math.min(9.25, Math.max(6.25, maxLen * 0.48 + 1.55));
}

/** Larghezza colonna `<col>` pill: etichetta più lunga + padding celle. */
export function gestionaleListTablePillColStyleFromLabels(labels: readonly string[]): CSSProperties {
  const w = gestionaleListTablePillContentWidthRem(labels) + GESTIONALE_LIST_TABLE_PILL_COL_PAD_REM;
  return { width: `${w}rem`, minWidth: `${w}rem`, maxWidth: `${w}rem` };
}

export { globalTableBase, globalTableFixed };
