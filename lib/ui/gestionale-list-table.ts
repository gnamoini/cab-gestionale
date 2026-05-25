/**
 * DESIGN MASTER — tabella pagina Lavorazioni (`lavorazioni-view.tsx`).
 *
 * Tutte le liste gestionale con struttura simile (Clienti, Preventivi, Magazzino, …)
 * devono derivare da questi token e da `<GestionaleListTable>` — non duplicare classi locali.
 *
 * Checklist nuova tabella:
 * - Shell: `GestionaleListTable` (+ `visibilityClass` se c’è card mobile)
 * - Righe: `gestionaleListTableRowClass`
 * - Celle dati: `gestionaleListTableTd`
 * - Azioni: `GestionaleListTableActionsHead` + `gestionaleListTableTdAzioni` + `gestionaleListTableActionsGroup`
 * - Header sort: `GlobalTableSortTh` (mai titoli su due righe salvo eccezione documentata)
 * - Titoli: una riga, `whitespace-nowrap` (già in `GlobalTableHeadLabel` / `GlobalTableSortTh`)
 */
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
  dsTableActionsRowHeight,
  dsTableTdActions,
  dsTableThActions,
} from "@/lib/ui/design-system";

// —— Shell / contenitore (padding laterale via tbody inset, come Lavorazioni) ——

/** Card + scroll orizzontale — identico al wrap interno di `GlobalTable`. */
export const gestionaleListTableWrap = globalTableWrap;

/** Scrollbar + eventuale scope scroll pagina (es. modali lavorazioni). */
export const gestionaleListTableWrapClass = `${globalTableWrap} ${dsScrollbar}`;

/** Classe aggiuntiva sul wrap quando la lista è in pagina Lavorazioni / specchio clienti. */
export const gestionaleListTableScrollScopeClass = "lavorazioni-scroll-scope max-w-full overflow-x-hidden";

/** Preset completo wrap desktop (Lavorazioni master). */
export const gestionaleListTableMasterWrapClass = `${gestionaleListTableScrollScopeClass} ${gestionaleListTableWrapClass}`;

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

/** Celle centrate (date, numeri). */
export const gestionaleListTableTdCenter =
  "px-2 py-1 align-middle text-center text-xs font-medium tabular-nums text-zinc-800 dark:text-zinc-100";

/** Celle pill (stato, priorità, addetto). */
export const gestionaleListTableTdPill = "px-1.5 py-1 align-middle text-center";
export const gestionaleListTableTdPillWrap = "mx-auto max-w-full";

// —— Colonna Azioni (titolo centrato, +3px inset come Lavorazioni) ——

export const gestionaleListTableThAzioni =
  `${dsTableThActions} !pl-[calc(0.625rem+3px)]`;

export const gestionaleListTableTdAzioni =
  `${dsTableTdActions} !pl-[calc(0.5rem+3px)]`;

export const gestionaleListTableActionsGroup = dsTableActionsGroup;
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

export const gestionaleListColIngressoClass = "w-[7%]";
export const gestionaleListColCodiceClass = "w-[6%]";
export const gestionaleListColClienteClass = "w-[9%]";
export const gestionaleListColCantiereClass = "w-[9%]";
export const gestionaleListColAttrezzaturaClass = "w-[11.5%]";
export const gestionaleListColIdentificazioneClass = "w-[9.5%]";
export const gestionaleListColNoteClass = "w-[8%]";
export const gestionaleListColAzioniClass = "w-[12%]";

/** Utility: combina classi riga con stato highlight (navigazione da URL). */
export function gestionaleListTableRowClassNames(extra?: string): string {
  return [gestionaleListTableRowClass, extra].filter(Boolean).join(" ");
}

export { globalTableBase, globalTableFixed };
