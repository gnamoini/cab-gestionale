import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export type ResolveMezzoIdsFromWorkOrderSelectionResult = {
  mezzoIds: string[];
  skippedWithoutMezzo: number;
  /** Selezioni senza riga in cache (es. non ancora caricate). */
  skippedUnknownWorkOrder: number;
};

/**
 * Da lavorazioni selezionate → id mezzo unici, ordine = prima occorrenza nella selezione.
 */
export function resolveMezzoIdsFromWorkOrderSelection(
  orderedWorkOrderIds: readonly string[],
  rowById: ReadonlyMap<string, LavorazioneListRow>,
): ResolveMezzoIdsFromWorkOrderSelectionResult {
  const mezzoIds: string[] = [];
  const seenMezzi = new Set<string>();
  let skippedWithoutMezzo = 0;
  let skippedUnknownWorkOrder = 0;

  for (const workOrderId of orderedWorkOrderIds) {
    const row = rowById.get(workOrderId);
    if (!row) {
      skippedUnknownWorkOrder += 1;
      continue;
    }
    const mezzoId = row.mezzo_id?.trim();
    if (!mezzoId) {
      skippedWithoutMezzo += 1;
      continue;
    }
    if (seenMezzi.has(mezzoId)) continue;
    seenMezzi.add(mezzoId);
    mezzoIds.push(mezzoId);
  }

  return { mezzoIds, skippedWithoutMezzo, skippedUnknownWorkOrder };
}

export function buildLavorazioneRowByIdMap(
  rows: readonly LavorazioneListRow[],
): Map<string, LavorazioneListRow> {
  const map = new Map<string, LavorazioneListRow>();
  for (const row of rows) map.set(row.id, row);
  return map;
}
