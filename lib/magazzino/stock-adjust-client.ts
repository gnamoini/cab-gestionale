"use client";

import type { StockMovementOrigin } from "@/lib/magazzino/stock-movement-origin";

export type StockAdjustRequest = {
  ricambioId: string;
  delta: number;
  expectedVersion: number;
  operationId: string;
  origine?: StockMovementOrigin;
  causale?: string;
  contaStatistiche?: boolean;
  lavorazioneId?: string | null;
};

export type StockAdjustResponse = {
  ricambioId: string;
  quantita: number;
  stockVersion: number;
  movimentoId: string | null;
  operationId: string;
  quantitaBefore?: number;
  delta?: number;
  idempotent?: boolean;
  noop?: boolean;
};

export type StockAdjustConflict = {
  error: string;
  code: "STOCK_VERSION_CONFLICT";
  current: { quantita: number; stockVersion: number } | null;
};

export async function stockAdjustFetch(
  input: StockAdjustRequest,
): Promise<{ ok: true; data: StockAdjustResponse } | { ok: false; status: number; error: string; conflict?: StockAdjustConflict }> {
  const res = await fetch("/api/magazzino/stock/adjust", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ricambioId: input.ricambioId,
      delta: input.delta,
      expectedVersion: input.expectedVersion,
      operationId: input.operationId,
      origine: input.origine,
      causale: input.causale,
      contaStatistiche: input.contaStatistiche,
      lavorazioneId: input.lavorazioneId,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    if (res.status === 409) {
      return {
        ok: false,
        status: 409,
        error: String(body.error ?? "Conflitto versione"),
        conflict: body as unknown as StockAdjustConflict,
      };
    }
    return {
      ok: false,
      status: res.status,
      error: String(body.error ?? "Aggiornamento stock non riuscito"),
    };
  }

  return {
    ok: true,
    data: {
      ricambioId: String(body.ricambioId),
      quantita: Math.round(Number(body.quantita) || 0),
      stockVersion: Math.round(Number(body.stockVersion) || 0),
      movimentoId: body.movimentoId ? String(body.movimentoId) : null,
      operationId: String(body.operationId),
      quantitaBefore: body.quantitaBefore != null ? Math.round(Number(body.quantitaBefore)) : undefined,
      delta: body.delta != null ? Math.round(Number(body.delta)) : undefined,
      idempotent: body.idempotent === true,
      noop: body.noop === true,
    },
  };
}
