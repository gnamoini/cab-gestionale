"use client";

import { isKnownStockOperation } from "@/lib/magazzino/stock-operation-registry";
import { shouldSuppressRemoteCacheInvalidation } from "@/lib/sync/recent-local-mutation";

export type StockRealtimeRecord = {
  id?: string;
  quantita?: number;
  stock_version?: number;
  operation_id?: string | null;
  ricambio_id?: string;
};

function stockEntityId(table: string, record: StockRealtimeRecord): string | undefined {
  if (table === "movimenti_ricambi") {
    return record.ricambio_id?.trim() || record.id?.trim();
  }
  return record.id?.trim();
}

/** Self-echo locale: merge UI only, nessun dirty/invalidate. */
export function isSelfOriginatedStockRealtimeEvent(
  table: string,
  record: StockRealtimeRecord | null | undefined,
): boolean {
  if (!record) return false;
  if (table !== "magazzino_ricambi" && table !== "movimenti_ricambi") return false;

  const entityId = stockEntityId(table, record);
  if (entityId && shouldSuppressRemoteCacheInvalidation(table, entityId)) {
    return true;
  }
  if (table === "magazzino_ricambi" && entityId) {
    if (shouldSuppressRemoteCacheInvalidation("magazzino_ricambi", entityId)) {
      return true;
    }
  }

  const operationId = record.operation_id?.trim();
  if (operationId && isKnownStockOperation(operationId)) {
    return true;
  }

  return false;
}
