"use client";

import type { QueryClient } from "@tanstack/react-query";
import { stockAdjustFetch } from "@/lib/magazzino/stock-adjust-client";
import { getStockEntity, mergeStockEntity } from "@/lib/magazzino/stock-entity-cache";
import { scheduleReportBroadcastRefresh } from "@/lib/report/report-refresh";
import { movimentiListQueryKey } from "@/lib/render/query-key-factory";

export async function applyMagazzinoScaricoDaScheda(opts: {
  ricambioId: string;
  lavorazioneId: string;
  quantita: number;
  autore: string;
  riepilogo: string;
  qc: QueryClient;
  /** Persisted on scheda row; generated once per business scarico intent. */
  scaricoOperationId?: string;
}): Promise<{ ok: true; operationId: string } | { ok: false; error: string }> {
  void opts.autore;
  void opts.riepilogo;
  const qty = Math.round(Number(opts.quantita));
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: "Quantità non valida" };

  const entity = getStockEntity(opts.qc, opts.ricambioId);
  const operationId = opts.scaricoOperationId ?? crypto.randomUUID();
  const res = await stockAdjustFetch({
    ricambioId: opts.ricambioId,
    delta: -qty,
    expectedVersion: entity?.stockVersion ?? 0,
    operationId,
    origine: "lavorazione",
    causale: "scarico_lavorazione",
    contaStatistiche: true,
    lavorazioneId: opts.lavorazioneId,
  });

  if (!res.ok) {
    return { ok: false, error: res.error ?? "Movimento magazzino non riuscito." };
  }

  mergeStockEntity(
    opts.qc,
    {
      ricambioId: opts.ricambioId,
      quantita: res.data.quantita,
      stockVersion: res.data.stockVersion,
      lastOperationId: res.data.operationId,
    },
    "mutation",
    { operationId: res.data.operationId, receivedVersion: res.data.stockVersion },
  );

  void opts.qc.invalidateQueries({ queryKey: movimentiListQueryKey({ ricambio_id: opts.ricambioId }) });
  void opts.qc.invalidateQueries({ queryKey: ["movimenti", "ricambio", opts.ricambioId] });
  scheduleReportBroadcastRefresh(opts.qc);
  void opts.qc.invalidateQueries({ queryKey: ["dashboard", "health-score"] });

  return { ok: true, operationId: res.data.operationId };
}
