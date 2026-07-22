/**
 * Token primitivi tabella gestionale.
 *
 * **Design master:** pagina Lavorazioni — preset lista in `@/lib/ui/gestionale-list-table`
 * e `<GestionaleListTable>` da `@/components/gestionale/global-table`.
 *
 * Per nuove liste dense: non usare solo questi token a mano; preferire il preset master.
 */

/** Sfondo riga intestazione (`<thead>`). */
export const globalTableTheadClass =
  "min-w-0 border-b border-zinc-100 bg-[var(--cab-surface-2)] dark:border-zinc-800";

/** Padding e allineamento base ogni `<th>`. */
export const globalTableThCell = "min-w-0 px-2.5 py-2 align-middle";

/**
 * Header allineato al testo in chip/pill (`px-2`) dentro cella compatta (`px-2`).
 * Totale inset sinistro 16px — non al bordo del box.
 */
export const globalTableThCellChipInset = "!pl-4 pr-2.5 text-left";

/** Tipografia etichette header (statiche e pulsanti sort) — stessa dimensione del corpo tabella. */
export const globalTableThLabel =
  "text-[13px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

/** Etichetta singola riga nel pulsante sort (titolo intero, una riga). */
export const globalTableSortLabelSingle = "shrink-0 whitespace-nowrap leading-none";

/** Pulsante ordinamento dentro `<th>`. */
export const globalTableSortButton =
  "inline-flex w-full max-w-full min-w-0 flex-nowrap items-center text-[13px] font-semibold uppercase leading-none tracking-wide transition-colors duration-200 ease-out";

/** Label + icona sort — gruppo a larghezza naturale, icona dopo il titolo. */
export const globalTableSortControl = "inline-flex shrink-0 flex-nowrap items-center gap-1.5";

/** Contenitore icona sort. */
export const globalTableSortIconWrap =
  "inline-flex h-3 w-3 shrink-0 flex-none items-center justify-center leading-none";

/** Etichetta header su due righe (es. Data / ingresso). */
export const globalTableSortLabelStack =
  "min-w-0 shrink text-left leading-[1.15] normal-case";

export const globalTableSortLabelStackLine =
  "block whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide";

export const globalTableSortActive = "text-[color:var(--cab-primary)]";
export const globalTableSortIdle =
  "text-[color:var(--cab-text-muted)] hover:text-[color:var(--cab-text)]";

/** Contenitore scroll + card tabella (desktop liste). */
export const globalTableWrap =
  "min-w-0 max-w-full overflow-x-auto overflow-y-clip rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] shadow-[var(--cab-shadow-sm)]";

/**
 * @deprecated Non usare sul wrap: inset solo sul body (`globalTableTbodyInset`).
 * Header a tutta larghezza, titoli allineati con `globalTableHeadEdgeInset`.
 */
export const globalTableWrapInset = "px-2 sm:px-3";

/** Padding laterale solo sul body (prime/ultime celle). */
export const globalTableTbodyInset =
  "[&_tr>td:first-child]:pl-4 sm:[&_tr>td:first-child]:pl-5 [&_tr>td:last-child]:pr-4 sm:[&_tr>td:last-child]:pr-5";

/**
 * Prime/ultime `<th>`: stesso offset testo di prima (wrap px-2/sm:px-3 + th px-2.5)
 * con sfondo thead a tutta larghezza.
 */
export const globalTableHeadEdgeInset =
  "min-w-0 [&>th:first-child]:pl-[calc(0.5rem+0.625rem)] sm:[&>th:first-child]:pl-[calc(0.75rem+0.625rem)] [&>th:last-child]:pr-[calc(0.5rem+0.625rem)] sm:[&>th:last-child]:pr-[calc(0.75rem+0.625rem)]";

/** Celle corpo liste lavorazioni — allineamento sinistra. */
export const globalTableTdBody = "min-w-0 px-2 py-1 align-middle text-left";

/** Colonna azioni (header + celle) — allineata al preset `dsTableTdActions`. */
export const globalTableTdActions =
  "whitespace-nowrap px-2 py-1 align-middle text-center";

/** Tabella: corpo e numeri. */
export const globalTableBase =
  "min-w-full w-full border-collapse text-left text-[13px] leading-tight text-[color:var(--cab-text)]";

/**
 * `table-auto` sotto `xl` per evitare compressione eccessiva in larghezze intermedie;
 * `xl:table-fixed` mantiene densità e allineamenti desktop.
 */
export const globalTableFixed = `${globalTableBase} table-auto xl:table-fixed`;

/** Riga corpo standard. */
export const globalTableRow =
  "group border-b border-[color:var(--cab-border)] transition-colors duration-150 ease-out hover:bg-[var(--cab-hover)] data-[selected=true]:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-card))]";

/** Righe spacer virtual scroll — niente hover né bordo. */
export const globalTableVirtualSpacerRow = "pointer-events-none border-0";

/** Padding virtuali TanStack solo se il wrap ha scroll verticale reale (`overflow-y` scroll/auto). */
export function globalTableScrollElementAllowsVerticalVirtualPadding(el: HTMLElement): boolean {
  const oy = getComputedStyle(el).overflowY;
  return oy === "auto" || oy === "scroll" || oy === "overlay";
}

/** Cella vuota / empty state (con inset laterale come il body). */
export const globalTableEmptyCell =
  "px-4 py-8 text-center text-sm text-[color:var(--cab-text-muted)] sm:px-5";

/** Intestazione sticky (toolbar liste con scroll). */
export const globalTableTheadSticky = "sticky top-0 z-[2] bg-[var(--cab-surface-2)]";

export type GlobalTableSortPhase = "natural" | "asc" | "desc";

export function cycleGlobalTableSort<K extends string>(
  sortColumn: K | null,
  sortPhase: GlobalTableSortPhase,
  key: K,
): { column: K | null; phase: GlobalTableSortPhase } {
  if (sortColumn !== key) return { column: key, phase: "asc" };
  if (sortPhase === "asc") return { column: key, phase: "desc" };
  if (sortPhase === "desc") return { column: null, phase: "natural" };
  return { column: key, phase: "asc" };
}

export function globalTableThAlign(align: "left" | "center" | "right"): string {
  if (align === "left") return "text-left";
  if (align === "right") return "text-right";
  return "text-center";
}

export function globalTableButtonJustify(align: "left" | "center" | "right"): string {
  if (align === "left") return "justify-start";
  if (align === "right") return "justify-end";
  return "justify-center";
}

/** Titolo colonna data ingresso — due righe, «ingresso» per esteso + freccia affiancata. */
export const globalTableLabelIngressoLines = ["Data", "ingresso"] as const;

/** Titolo colonna identificazione — per esteso su due righe (no troncamento). */
export const globalTableLabelIdentificazioneLines = ["Identifica", "zione"] as const;
