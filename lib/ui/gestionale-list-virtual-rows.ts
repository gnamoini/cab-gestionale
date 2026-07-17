"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import type { GlobalTableVirtualRows } from "@/components/gestionale/global-table/global-table";
import { CLIENT_PAGE_SIZE } from "@/lib/ui/use-client-pagination";

/** Soglia minima righe per virtualizzazione tbody — allineata a paginazione client. */
export const GESTIONALE_LIST_VIRTUALIZE_THRESHOLD = Math.min(40, CLIENT_PAGE_SIZE);

export type UseGestionaleListVirtualRowsOptions<T> = {
  rows: readonly T[];
  renderRow: (row: T, index: number) => ReactNode;
  estimateRowHeight?: number;
  overscan?: number;
  /** Override soglia (default 40). */
  threshold?: number;
};

/**
 * Helper SSOT per `GlobalTable` virtualRows — abilita virtual sopra soglia.
 * Il consumer deve passare `renderRow` stabile (`useCallback`).
 */
export function useGestionaleListVirtualRows<T>({
  rows,
  renderRow,
  estimateRowHeight = 52,
  overscan = 8,
  threshold = GESTIONALE_LIST_VIRTUALIZE_THRESHOLD,
}: UseGestionaleListVirtualRowsOptions<T>): GlobalTableVirtualRows | undefined {
  const stableRenderRow = useCallback(
    (index: number) => renderRow(rows[index]!, index),
    [rows, renderRow],
  );

  return useMemo(() => {
    if (rows.length < threshold) return undefined;
    return {
      rowCount: rows.length,
      renderRow: stableRenderRow,
      estimateRowHeight,
      overscan,
    };
  }, [rows.length, stableRenderRow, estimateRowHeight, overscan, threshold]);
}
