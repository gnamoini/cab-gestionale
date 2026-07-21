import type { StockMovementOrigin } from "@/lib/magazzino/stock-movement-origin";

/** Payload audit standard per variazioni quantità (R-19). */
export type StockMovementAuditPayload = {
  ricambio_id: string;
  quantita_before: number;
  delta: number;
  quantita_after: number;
  causale: string;
  origine: StockMovementOrigin;
  utente?: string | null;
  movimento_id?: string;
  operation_id?: string | null;
  storno_di?: string;
  source?: string;
  batchId?: string;
  fileName?: string;
};

export function buildStockMovementAuditPayload(input: {
  ricambioId: string;
  quantitaBefore: number;
  quantitaAfter: number;
  origine: StockMovementOrigin;
  causale: string;
  utente?: string | null;
  movimentoId?: string;
  operationId?: string | null;
  stornoDi?: string;
  extra?: Pick<StockMovementAuditPayload, "source" | "batchId" | "fileName">;
}): StockMovementAuditPayload {
  const before = Math.max(0, Math.round(input.quantitaBefore));
  const after = Math.max(0, Math.round(input.quantitaAfter));
  return {
    ricambio_id: input.ricambioId,
    quantita_before: before,
    delta: after - before,
    quantita_after: after,
    causale: input.causale,
    origine: input.origine,
    utente: input.utente ?? null,
    movimento_id: input.movimentoId,
    operation_id: input.operationId ?? null,
    storno_di: input.stornoDi,
    ...input.extra,
  };
}
