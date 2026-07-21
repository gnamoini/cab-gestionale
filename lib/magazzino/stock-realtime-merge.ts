"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useDeterministicStockPipeline } from "@/lib/feature-flags/stock-pipeline";
import {
  shouldSkipStockRealtimeInvalidate,
  tryMergeStockFromRealtimeGate,
} from "@/lib/magazzino/stock-realtime-gate";
import { mergeStockEntity, stockEntityFromRow } from "@/lib/magazzino/stock-entity-cache";

type StockRealtimeRecord = {
  id?: string;
  quantita?: number;
  stock_version?: number;
  operation_id?: string | null;
  ricambio_id?: string;
};

/** Applica merge gate su evento realtime magazzino — v4 gate o legacy merge. */
export function tryMergeStockFromRealtime(
  qc: QueryClient,
  table: string,
  record: StockRealtimeRecord | null | undefined,
  movimentoMeta?: { ricambioId?: string; operationId?: string | null },
): boolean {
  if (!record && !movimentoMeta?.ricambioId) return false;

  if (useDeterministicStockPipeline()) {
    return tryMergeStockFromRealtimeGate(qc, table, record ?? undefined);
  }

  if (table === "magazzino_ricambi" && record?.id) {
    const result = mergeStockEntity(
      qc,
      stockEntityFromRow(
        {
          id: record.id,
          quantita: Number(record.quantita) || 0,
          stock_version: Number(record.stock_version) || 0,
        },
        movimentoMeta?.operationId ?? record.operation_id,
      ),
      "realtime",
    );
    return result.decision === "merge";
  }

  return false;
}

export function shouldSuppressStockRealtimeForTable(
  table: string,
  record: StockRealtimeRecord | null | undefined,
): boolean {
  if (!useDeterministicStockPipeline()) return false;
  return shouldSkipStockRealtimeInvalidate(table, record ?? undefined);
}
