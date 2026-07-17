"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  memo,
  type ReactElement,
  type ReactNode,
} from "react";
import { dsFocus } from "@/lib/ui/design-system";
import { GlobalTableSortIcon } from "@/components/gestionale/global-table/global-table-sort-icon";
import {
  cycleGlobalTableSort,
  globalTableButtonJustify,
  globalTableSortActive,
  globalTableSortButton,
  globalTableSortControl,
  globalTableSortLabelSingle,
  globalTableSortLabelStack,
  globalTableSortLabelStackLine,
  globalTableSortIdle,
  globalTableThAlign,
  globalTableThCell,
  globalTableThCellChipInset,
  globalTableThLabel,
  globalTableHeadEdgeInset,
  globalTableTheadClass,
  globalTableTheadSticky,
  type GlobalTableSortPhase,
} from "@/lib/ui/global-table";

export type { GlobalTableSortPhase };

export const cycleGestionaleSort = cycleGlobalTableSort;
export type GestionaleSortPhase = GlobalTableSortPhase;

export type GlobalTableHeadLabelProps = {
  label: string;
  align?: "left" | "center" | "right";
  thClassName?: string;
  scope?: "col" | "row" | "colgroup" | "rowgroup";
  "aria-label"?: string;
};

/** Solo contenuto titolo — mai un `<th>` (wrapping a cura di GlobalTableHead o cella manuale). */
export function GlobalTableHeadLabelContent({ label }: { label: string }) {
  return (
    <span className={`${globalTableThLabel} block min-w-0 truncate whitespace-nowrap`}>{label}</span>
  );
}

/** Cella header statica — SSOT per markup `<th>`. */
export function globalTableHeadLabelCell({
  label,
  align = "left",
  thClassName = "",
  scope,
  "aria-label": ariaLabel,
}: GlobalTableHeadLabelProps) {
  return (
    <th
      scope={scope}
      aria-label={ariaLabel}
      className={`${globalTableThCell} ${globalTableThAlign(align)} ${thClassName}`.trim()}
    >
      {label ? <GlobalTableHeadLabelContent label={label} /> : null}
    </th>
  );
}

function isTableRowElement(node: ReactNode): node is ReactElement<{ children?: ReactNode }> {
  return isValidElement(node) && node.type === "tr";
}

function isTableCellElement(node: ReactNode): boolean {
  return isValidElement(node) && (node.type === "th" || node.type === "td");
}

/** `Tooltip` restituisce un Fragment — non può essere figlio diretto di `<tr>`. */
function isTooltipElement(el: ReactElement): boolean {
  if (typeof el.type !== "function") return false;
  return (el.type as { name?: string }).name === "Tooltip";
}

function unwrapTooltipTableCell(child: ReactNode): ReactNode {
  if (!isValidElement(child) || !isTooltipElement(child)) return child;
  const inner = (child.props as { children?: ReactNode }).children;
  if (isValidElement(inner) && isTableCellElement(inner)) return inner;
  return child;
}

function isHeadLabelElement(el: ReactElement): boolean {
  if (typeof el.type !== "function") return false;
  return (el.type as { displayName?: string }).displayName === "GlobalTableHeadLabel";
}

function cellFromChild(child: ReactNode, index: number): ReactNode {
  if (child == null || child === false) return null;
  if (!isValidElement(child)) return null;

  const el = unwrapTooltipTableCell(child) as ReactElement;
  const key = el.key ?? index;

  if (isTableCellElement(el)) {
    return cloneElement(el, { key });
  }

  if (isHeadLabelElement(el)) {
    return cloneElement(
      globalTableHeadLabelCell(el.props as GlobalTableHeadLabelProps) as ReactElement,
      { key },
    );
  }

  return cloneElement(el, { key });
}

/** Normalizza figli header: evita `<tr>` duplicati e `<th>` annidati. */
export function normalizeGlobalTableHeadChildren(children: ReactNode): ReactNode {
  const items = Children.toArray(children).filter(Boolean) as ReactNode[];

  if (items.length === 0) {
    return <tr className={globalTableHeadEdgeInset} />;
  }

  if (items.length === 1 && isTableRowElement(items[0])) {
    return items[0];
  }

  if (items.every(isTableRowElement)) {
    return items.map((row, index) => cloneElement(row, { key: row.key ?? index }));
  }

  return (
    <tr className={globalTableHeadEdgeInset}>
      {items.map((child, index) => cellFromChild(child, index))}
    </tr>
  );
}

export function GlobalTableHead({
  children,
  sticky,
}: {
  children: ReactNode;
  sticky?: boolean;
}) {
  return (
    <thead className={`${globalTableTheadClass} ${sticky ? globalTableTheadSticky : ""}`.trim()}>
      {normalizeGlobalTableHeadChildren(children)}
    </thead>
  );
}

/** Colonna ordinabile — design globale ufficiale. */
function GlobalTableSortThInner<K extends string>({
  label,
  /** Titolo su due righe (es. `["Data", "ingresso"]`) — evita troncamento in colonne strette. */
  labelLines,
  columnKey,
  sortColumn,
  sortPhase,
  onSort,
  align = "left",
  thClassName = "",
  /** Allinea il titolo al testo in chip/pill sotto (es. codice ricambio), non al box. */
  contentChipInset = false,
  /** Se false, mantiene stile header neutro anche quando la colonna è ordinata attivamente. */
  highlightWhenActive = true,
}: {
  label: string;
  labelLines?: readonly [string, string];
  columnKey: K;
  sortColumn: K | null;
  sortPhase: GlobalTableSortPhase;
  onSort: (k: K) => void;
  align?: "left" | "center" | "right";
  thClassName?: string;
  contentChipInset?: boolean;
  highlightWhenActive?: boolean;
}) {
  const active = sortColumn === columnKey && (sortPhase === "asc" || sortPhase === "desc");
  const showActiveHighlight = active && highlightWhenActive;
  const stacked = labelLines != null;
  const resolvedAlign = contentChipInset || stacked ? "left" : align;
  const ariaSort = active ? (sortPhase === "asc" ? "ascending" : "descending") : "none";
  const sortHint = active
    ? sortPhase === "asc"
      ? "ordinato crescente"
      : "ordinato decrescente"
    : "non ordinato";
  const sortLabel = stacked ? `${labelLines[0]} ${labelLines[1]}` : label;
  const labelNode = stacked ? (
    <span className={globalTableSortLabelStack}>
      <span className={globalTableSortLabelStackLine}>{labelLines[0]}</span>
      <span className={globalTableSortLabelStackLine}>{labelLines[1]}</span>
    </span>
  ) : (
    <span className={globalTableSortLabelSingle}>{label}</span>
  );
  return (
    <th
      aria-sort={ariaSort}
      className={`${globalTableThCell} ${contentChipInset ? globalTableThCellChipInset : globalTableThAlign(resolvedAlign)} ${thClassName}`}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        aria-label={`${sortLabel}: ${sortHint}. Clic per cambiare ordinamento`}
        className={`${globalTableSortButton} ${stacked ? "py-0.5" : ""} ${globalTableButtonJustify(resolvedAlign)} ${dsFocus} ${
          showActiveHighlight ? globalTableSortActive : globalTableSortIdle
        }`}
      >
        <span
          className={`${globalTableSortControl} ${stacked ? "items-start gap-1.5" : ""}`.trim()}
        >
          {labelNode}
          <GlobalTableSortIcon active={active} phase={sortPhase} className={stacked ? "self-center" : undefined} />
        </span>
      </button>
    </th>
  );
}

export const GlobalTableSortTh = memo(GlobalTableSortThInner) as typeof GlobalTableSortThInner;

/**
 * Colonna statica (es. Azioni).
 * In `<thead><tr>` manuali restituisce la cella `<th>` completa.
 * Usato come figlio di `GlobalTableHead`, la cella è materializzata dal normalizer (no doppio `<th>`).
 */
export function GlobalTableHeadLabel(props: GlobalTableHeadLabelProps) {
  return globalTableHeadLabelCell(props);
}
GlobalTableHeadLabel.displayName = "GlobalTableHeadLabel";

/** Alias retrocompatibilità. */
export const GestionaleSortTh = GlobalTableSortTh;
export const GestionaleTableHeadLabel = GlobalTableHeadLabel;
