"use client";

import type { QueryClient } from "@tanstack/react-query";
import {
  cabSyncEventForEntity,
  dispatchGestionaleLocalMutation,
} from "@/lib/sync/gestionale-sync-dispatch";
import { movimentiService } from "@/src/services/movimenti.service";

export async function applyMagazzinoScaricoDaScheda(opts: {
  ricambioId: string;
  lavorazioneId: string;
  quantita: number;
  autore: string;
  riepilogo: string;
  qc: QueryClient;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  void opts.autore;
  void opts.riepilogo;
  const qty = Math.round(Number(opts.quantita));
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false, error: "Quantità non valida" };

  const res = await movimentiService.create(
    {
      ricambio_id: opts.ricambioId,
      lavorazione_id: opts.lavorazioneId,
      tipo: "uscita",
      quantita: qty,
      conta_statistiche: true,
      meta: { origine: "lavorazione", causale: "scarico_lavorazione" },
    },
    {
      operationId: crypto.randomUUID(),
      origine: "lavorazione",
      causale: "scarico_lavorazione",
    },
  );

  if (!res.success || !res.data) {
    return { ok: false, error: res.error ?? "Movimento magazzino non riuscito." };
  }

  const mov = res.data;
  dispatchGestionaleLocalMutation(opts.qc, ["movimenti_ricambi", "magazzino_ricambi", "lavorazioni"], [
    cabSyncEventForEntity("movimenti_ricambi", mov.id, "entity_created", "movimenti_ricambi"),
    cabSyncEventForEntity("magazzino_ricambi", opts.ricambioId, "entity_updated", "magazzino_ricambi"),
  ]);

  return { ok: true };
}
