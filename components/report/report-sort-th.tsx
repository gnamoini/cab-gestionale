"use client";

import {
  cycleGestionaleSort,
  GestionaleSortTh,
  type GestionaleSortPhase,
} from "@/components/gestionale/global-table";

/** @deprecated Usare `GestionaleSortPhase`. */
export type ReportSortPhase = GestionaleSortPhase;

export const cycleReportSort = cycleGestionaleSort;

/** Report: stesso header tabella del gestionale; allineamento sinistro per numeri/testo report. */
export function ReportSortTh<K extends string>(props: {
  label: string;
  columnKey: K;
  sortColumn: K | null;
  sortPhase: ReportSortPhase;
  onSort: (k: K) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const align = props.align === "right" ? "right" : "left";
  return (
    <GestionaleSortTh
      label={props.label}
      columnKey={props.columnKey}
      sortColumn={props.sortColumn}
      sortPhase={props.sortPhase}
      onSort={props.onSort}
      align={align}
      thClassName={props.className}
    />
  );
}
