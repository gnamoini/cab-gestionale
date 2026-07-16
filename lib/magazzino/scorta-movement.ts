"use client";

import { movimentiEntry } from "@/lib/domain/movimenti-entry";
import { magazzinoService } from "@/src/services/magazzino.service";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import type { TipoMovimentoRicambio } from "@/src/types/supabase-tables";

/** Applica delta scorta tramite movimento DB (SSOT giacenza + tracciabilità statistiche). */
export async function applyScortaDeltaViaMovimento(
  ricambioId: string,
  delta: number,
  contaStatistiche: boolean,
): Promise<ServiceResult<number>> {
  const rounded = Math.round(delta);
  if (rounded === 0) {
    const got = await magazzinoService.getById(ricambioId);
    if (!got.success || !got.data) return err(got.error ?? "Ricambio non trovato");
    return success(Math.max(0, Math.round(Number(got.data.quantita) || 0)));
  }

  const tipo: TipoMovimentoRicambio = rounded > 0 ? "entrata" : "uscita";
  const mov = await movimentiEntry.create({
    ricambio_id: ricambioId,
    lavorazione_id: null,
    tipo,
    quantita: Math.abs(rounded),
    conta_statistiche: contaStatistiche,
  });
  if (!mov.success) return err(mov.error ?? "Movimento magazzino non riuscito.");

  const got = await magazzinoService.getById(ricambioId);
  if (!got.success || !got.data) return err(got.error ?? "Ricambio non trovato dopo movimento");
  return success(Math.max(0, Math.round(Number(got.data.quantita) || 0)));
}
