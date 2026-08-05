"use client";

/**
 * Realtime gate stock v4 — dedupe per operation_id + merge version.
 */

import type { QueryClient } from "@tanstack/react-query";
import { shouldSuppressStockRealtimeInvalidate } from "@/lib/magazzino/stock-operation-registry";
import { getStockEntity, mergeStockEntity, stockEntityFromRow } from "@/lib/magazzino/stock-entity-cache";
import { logStockPipelineEvent } from "@/lib/magazzino/stock-pipeline-telemetry";

type StockRealtimeRecord = {
  id?: string;
  quantita?: number;
  stock_version?: number;
  operation_id?: string | null;
  ricambio_id?: string;
};

export function tryMergeStockFromRealtimeGate(
  qc: QueryClient,
  table: string,
  record: StockRealtimeRecord | null | undefined,
): boolean {
  if (!record) return false;

  const operationId = record.operation_id?.trim() || null;

  if (table === "magazzino_ricambi" && record.id) {
    if (!getStockEntity(qc, record.id)) return false;
    const result = mergeStockEntity(
      qc,
      stockEntityFromRow(
        {
          id: record.id,
          quantita: Number(record.quantita) || 0,
          stock_version: Number(record.stock_version) || 0,
        },
        operationId,
      ),
      "realtime",
    );
    logStockPipelineEvent({
      source: "realtime",
      operationId,
      ricambioId: record.id,
      responseVersion: Number(record.stock_version) || 0,
      detail: `merge:${result.decision}`,
    });
    return result.decision === "merge";
  }

  return false;
}

export function shouldSkipStockRealtimeInvalidate(
  table: string,
  record: StockRealtimeRecord | null | undefined,
): boolean {
  if (table !== "movimenti_ricambi" && table !== "magazzino_ricambi") return false;
  const operationId = record?.operation_id?.trim() || null;
  return shouldSuppressStockRealtimeInvalidate(operationId);
}
