"use client";

import type { ReactNode } from "react";
import { dsFocus } from "@/lib/ui/design-system";
import {
  cycleGlobalTableSort,
  globalTableButtonJustify,
  globalTableSortActive,
  globalTableSortButton,
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

/** @deprecated Usare `globalTableTheadClass`. */
export const gestionaleTableTheadClass = globalTableTheadClass;

export function GlobalTableHead({
  children,
  sticky,
}: {
  children: ReactNode;
  sticky?: boolean;
}) {
  return (
    <thead className={`${globalTableTheadClass} ${sticky ? globalTableTheadSticky : ""}`.trim()}>
      <tr className={globalTableHeadEdgeInset}>{children}</tr>
    </thead>
  );
}

/** Colonna ordinabile — design globale ufficiale. */
export function GlobalTableSortTh<K extends string>({
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
}) {
  const active = sortColumn === columnKey && (sortPhase === "asc" || sortPhase === "desc");
  const stacked = labelLines != null;
  const resolvedAlign = contentChipInset || stacked ? "left" : align;
  let icon: ReactNode = <span className="shrink-0 opacity-40">↕</span>;
  if (active) icon = sortPhase === "asc" ? <span className="shrink-0">↑</span> : <span className="shrink-0">↓</span>;
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
      className={`${globalTableThCell} ${contentChipInset ? globalTableThCellChipInset : globalTableThAlign(resolvedAlign)} ${thClassName}`}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`${globalTableSortButton} ${stacked ? "items-start gap-1.5 py-0.5" : ""} ${globalTableButtonJustify(resolvedAlign)} ${dsFocus} ${
          active ? globalTableSortActive : globalTableSortIdle
        }`}
      >
        {labelNode}
        {icon}
      </button>
    </th>
  );
}

/** Colonna statica (es. Azioni). */
export function GlobalTableHeadLabel({
  label,
  align = "left",
  thClassName = "",
}: {
  label: string;
  align?: "left" | "center" | "right";
  thClassName?: string;
}) {
  return (
    <th className={`${globalTableThCell} ${globalTableThAlign(align)} ${thClassName}`}>
      <span className={`${globalTableThLabel} block min-w-0 truncate whitespace-nowrap`}>{label}</span>
    </th>
  );
}

/** Alias retrocompatibilità. */
export const GestionaleSortTh = GlobalTableSortTh;
export const GestionaleTableHeadLabel = GlobalTableHeadLabel;
