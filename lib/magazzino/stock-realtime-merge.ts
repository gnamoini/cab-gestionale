"use client";

import type { QueryClient } from "@tanstack/react-query";
import { isDeterministicStockPipelineActive } from "@/lib/feature-flags/stock-pipeline";
import {
  shouldSkipStockRealtimeInvalidate,
  tryMergeStockFromRealtimeGate,
} from "@/lib/magazzino/stock-realtime-gate";
import { getStockEntity, mergeStockEntity, stockEntityFromRow } from "@/lib/magazzino/stock-entity-cache";

type StockRealtimeRecord = {
  id?: string;
  quantita?: number;
  stock_version?: number;
  operation_id?: string | null;
  ricambio_id?: string;
};

export { isSelfOriginatedStockRealtimeEvent } from "@/lib/magazzino/stock-realtime-self-echo";
export type { StockRealtimeRecord } from "@/lib/magazzino/stock-realtime-self-echo";

/** Patch UI qty — true solo se merge applicato. Non decide dirty/invalidate. */
export function tryMergeStockFromRealtime(
  qc: QueryClient,
  table: string,
  record: StockRealtimeRecord | null | undefined,
  movimentoMeta?: { ricambioId?: string; operationId?: string | null },
): boolean {
  if (!record && !movimentoMeta?.ricambioId) return false;

  if (isDeterministicStockPipelineActive()) {
    return tryMergeStockFromRealtimeGate(qc, table, record ?? undefined);
  }

  if (table === "magazzino_ricambi" && record?.id) {
    const ricambioId = record.id;
    if (!getStockEntity(qc, ricambioId)) return false;
    const result = mergeStockEntity(
      qc,
      stockEntityFromRow(
        {
          id: ricambioId,
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
  if (!isDeterministicStockPipelineActive()) return false;
  return shouldSkipStockRealtimeInvalidate(table, record ?? undefined);
}
