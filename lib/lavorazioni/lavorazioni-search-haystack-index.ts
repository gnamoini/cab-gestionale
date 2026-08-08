import { buildSearchDocumentLavorazione } from "@/lib/search/builders/build-search-document-lavorazione";
import { probeDocumentBuild } from "@/lib/search/search-hot-path-probe";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

/** Precomputed haystack per riga — evita rebuild ad ogni query change. */
export function buildLavorazioniHaystackIndex(
  rows: readonly LavorazioneListRow[],
  schedeStore?: LavorazioneSchedeStore,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const row of rows) {
    probeDocumentBuild();
    index.set(row.id, buildSearchDocumentLavorazione(row, schedeStore));
  }
  return index;
}

export function lavHaystackForRow(
  row: LavorazioneListRow,
  haystackById: Map<string, string>,
  schedeStore?: LavorazioneSchedeStore,
): string {
  const cached = haystackById.get(row.id);
  if (cached !== undefined) return cached;
  probeDocumentBuild();
  const doc = buildSearchDocumentLavorazione(row, schedeStore);
  haystackById.set(row.id, doc);
  return doc;
}
