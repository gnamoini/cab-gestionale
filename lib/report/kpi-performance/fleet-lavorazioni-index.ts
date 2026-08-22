import {
  buildInterventiByMezzoIdFromLavorazioni,
  mezzoHaLavorazioneAttivaDb,
} from "@/lib/mezzi/interventi-from-lavorazioni-db";
import type { MezzoInterventoLavorazione, MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export type FleetLavorazioniIndex = {
  interventiByMezzoId: Map<string, MezzoInterventoLavorazione[]>;
  mezzoIdsWithActiveLavorazione: Set<string>;
};

/** O(lav + mezzi) — evita scan mezzi×lav ripetuti in kpi-performance. */
export function buildFleetLavorazioniIndex(
  mezzi: readonly MezzoGestito[],
  lavRows: readonly LavorazioneListRow[],
): FleetLavorazioniIndex {
  const interventiByMezzoId = buildInterventiByMezzoIdFromLavorazioni(mezzi, lavRows);
  const mezzoIdsWithActiveLavorazione = new Set<string>();
  for (const m of mezzi) {
    if (mezzoHaLavorazioneAttivaDb(m, lavRows)) {
      mezzoIdsWithActiveLavorazione.add(m.id);
    }
  }
  return { interventiByMezzoId, mezzoIdsWithActiveLavorazione };
}

export function mezzoHasActiveLavorazioneFromIndex(
  mezzoId: string,
  index: FleetLavorazioniIndex,
): boolean {
  return index.mezzoIdsWithActiveLavorazione.has(mezzoId);
}
