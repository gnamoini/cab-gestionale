"use client";

import { stockAdjustFetch } from "@/lib/magazzino/stock-adjust-client";
import { isStockPipelineClientEnabled } from "@/lib/feature-flags/stock-pipeline";
import type { StockMovementOrigin } from "@/lib/magazzino/stock-movement-origin";
import type { MagazzinoRicambioRow, MovimentoRicambioRow, TipoMovimentoRicambio } from "@/src/types/supabase-tables";
import type { ServiceResult } from "@/src/services/service-result";
import { err, success } from "@/src/services/service-result";
import type { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

function stockDelta(tipo: TipoMovimentoRicambio, quantita: number, reverse: boolean): number {
  const base = tipo === "entrata" ? 1 : -1;
  const s = reverse ? -base : base;
  return s * quantita;
}

/** Movimento via stock engine API (v4 SSOT). */
export async function applyStockViaPipelineApi(
  c: Awaited<ReturnType<typeof getBrowserSupabase>>,
  mov: Pick<MovimentoRicambioRow, "ricambio_id" | "tipo" | "quantita" | "lavorazione_id" | "conta_statistiche">,
  options: {
    operationId: string;
    origine: StockMovementOrigin;
    causale: string;
  },
): Promise<ServiceResult<{ movimento: MovimentoRicambioRow; ricambio: MagazzinoRicambioRow }>> {
  const { data: ric, error: e1 } = await c
    .from("magazzino_ricambi")
    .select("id, quantita, stock_version")
    .eq("id", mov.ricambio_id)
    .maybeSingle();
  if (e1) return err("Errore lettura giacenza");
  if (!ric) return err("Ricambio non trovato");

  const delta = stockDelta(mov.tipo, Number(mov.quantita) || 0, false);
  const result = await stockAdjustFetch({
    ricambioId: mov.ricambio_id,
    delta,
    expectedVersion: Math.max(0, Math.round(Number(ric.stock_version) || 0)),
    operationId: options.operationId,
    origine: options.origine,
    causale: options.causale,
    contaStatistiche: mov.conta_statistiche ?? true,
    lavorazioneId: mov.lavorazione_id ?? null,
  });

  if (!result.ok) return err(result.error);

  const { data: movimento, error: e2 } = await c
    .from("movimenti_ricambi")
    .select("*")
    .eq("operation_id", options.operationId)
    .maybeSingle();
  if (e2 || !movimento) return err("Movimento non trovato dopo aggiornamento stock");

  const { data: ricambio, error: e3 } = await c
    .from("magazzino_ricambi")
    .select("*")
    .eq("id", mov.ricambio_id)
    .maybeSingle();
  if (e3 || !ricambio) return err("Ricambio non trovato dopo aggiornamento stock");

  return success({
    movimento: movimento as MovimentoRicambioRow,
    ricambio: ricambio as MagazzinoRicambioRow,
  });
}

export function shouldUseStockPipelineForMovimenti(): boolean {
  return isStockPipelineClientEnabled();
}
