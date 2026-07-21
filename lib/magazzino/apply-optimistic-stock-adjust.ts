import type { QueryClient } from "@tanstack/react-query";
import { markRecentLocalGestionaleMutation } from "@/lib/sync/recent-local-mutation";
import { getStockEntity, mergeStockEntity, type StockEntity } from "@/lib/magazzino/stock-entity-cache";

export type StockAdjustOptimisticInput = {
  ricambioId: string;
  delta: number;
  optimisticQuantita?: number;
  operationId: string;
};

/** Aggiornamento UI immediato — non attendere la rete. */
export function applyOptimisticStockAdjust(
  qc: QueryClient,
  input: StockAdjustOptimisticInput,
): StockEntity | null {
  const previous = getStockEntity(qc, input.ricambioId);
  const currentQ = previous?.quantita ?? 0;
  const targetQ =
    input.optimisticQuantita ?? Math.max(0, Math.round(currentQ + Math.round(input.delta)));

  mergeStockEntity(
    qc,
    {
      ricambioId: input.ricambioId,
      quantita: targetQ,
      stockVersion: (previous?.stockVersion ?? 0) + 1,
      lastOperationId: input.operationId,
    },
    "optimistic",
    {
      operationId: input.operationId,
      expectedVersion: previous?.stockVersion,
    },
  );
  markRecentLocalGestionaleMutation(["magazzino_ricambi", "movimenti_ricambi"], input.ricambioId);
  return previous;
}
