"use client";

import type { ReactNode } from "react";
import {
  GestionaleListTable,
  GestionaleListTableRow,
  GlobalTableHeadLabel,
} from "@/components/gestionale/global-table";
import type { ReviewColumn } from "@/lib/document-capture/capture-experience-adapter";
import { gestionaleListTableTd } from "@/lib/ui/gestionale-list-table";

export type DocumentCaptureReviewRow = {
  id: string;
  needsReview?: boolean;
  cells: Record<string, ReactNode>;
};

type Props = {
  columns: ReviewColumn[];
  rows: DocumentCaptureReviewRow[];
  emptyMessage?: string;
};

export function DocumentCaptureReviewTable({
  columns,
  rows,
  emptyMessage = "Nessuna riga da rivedere.",
}: Props) {
  return (
    <GestionaleListTable
      className="min-w-0"
      headRow={
        <>
          {columns.map((col) => (
            <GlobalTableHeadLabel key={col.id} label={col.label} />
          ))}
        </>
      }
      empty={rows.length === 0}
      emptyMessage={emptyMessage}
      colSpan={columns.length}
    >
      {rows.map((row) => (
        <GestionaleListTableRow
          key={row.id}
          className={
            row.needsReview
              ? "bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-surface))]"
              : undefined
          }
        >
          {columns.map((col) => (
            <td key={col.id} className={gestionaleListTableTd}>
              {row.cells[col.id] ?? "—"}
            </td>
          ))}
        </GestionaleListTableRow>
      ))}
    </GestionaleListTable>
  );
}

export function CaptureConfidenceBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-xs text-[color:var(--cab-text-muted)]">—</span>;
  const pct = Math.round(value * 100);
  const tone = pct >= 85 ? "text-[color:var(--cab-text-muted)]" : "text-amber-700 dark:text-amber-300";
  return <span className={`text-xs tabular-nums ${tone}`}>{pct}%</span>;
}
