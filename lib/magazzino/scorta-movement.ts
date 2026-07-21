"use client";

import { movimentiEntry } from "@/lib/domain/movimenti-entry";
import { magazzinoService } from "@/src/services/magazzino.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { StockMovementOrigin } from "@/lib/magazzino/stock-movement-origin";
import type { TipoMovimentoRicambio } from "@/src/types/supabase-tables";

export type ScortaMovimentoOptions = {
  operationId?: string;
  origine?: StockMovementOrigin;
  contaStatistiche?: boolean;
};

/** Applica delta scorta tramite movimento DB (SSOT giacenza + tracciabilità). */
export async function applyScortaDeltaViaMovimento(
  ricambioId: string,
  delta: number,
  contaStatistiche: boolean,
  options?: ScortaMovimentoOptions,
): Promise<ServiceResult<number>> {
  const rounded = Math.round(delta);
  const stats = options?.contaStatistiche ?? contaStatistiche;
  if (rounded === 0) {
    const got = await magazzinoService.getById(ricambioId);
    if (!got.success || !got.data) return err(got.error ?? "Ricambio non trovato");
    return success(Math.max(0, Math.round(Number(got.data.quantita) || 0)));
  }

  const tipo: TipoMovimentoRicambio = rounded > 0 ? "entrata" : "uscita";
  const origine = options?.origine ?? (stats ? "manual_adjustment" : "inventario");
  const causale = stats ? (rounded > 0 ? "carico_manuale" : "scarico_manuale") : "rettifica_inventario";

  const mov = await movimentiEntry.create(
    {
      ricambio_id: ricambioId,
      lavorazione_id: null,
      tipo,
      quantita: Math.abs(rounded),
      conta_statistiche: stats,
      meta: { origine, causale },
    },
    {
      operationId: options?.operationId,
      origine,
      causale,
    },
  );
  if (!mov.success) return err(mov.error ?? "Movimento magazzino non riuscito.");

  const got = await magazzinoService.getById(ricambioId);
  if (!got.success || !got.data) return err(got.error ?? "Ricambio non trovato dopo movimento");
  return success(Math.max(0, Math.round(Number(got.data.quantita) || 0)));
}
