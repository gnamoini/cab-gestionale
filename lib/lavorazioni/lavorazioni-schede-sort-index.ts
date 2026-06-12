import {
  lavorazioneAddettoLabel as addettoLabel,
  lavorazioneCantiereLabel as cantiereLabel,
  lavorazioneClienteLabel as clienteLabel,
  lavorazioneMacchinaLabel as macchinaLabel,
  lavorazioneMezzoIdent as mezzoIdent,
  lavorazioneUtilizzatoreLabel as utilizzatoreLabel,
} from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import { lavorazioneOreLavoroSortValue } from "@/lib/lavorazioni/lavorazioni-list-table-display";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type LavorazioneSchedeSortRowIndex = {
  macchina: string;
  mezzoIdent: string;
  cliente: string;
  utilizzatore: string;
  cantiere: string;
  addetto: string;
  oreTotali: number;
};

export type LavorazioneSchedeSortIndex = Readonly<Record<string, LavorazioneSchedeSortRowIndex>>;

/** Pre-index campi scheda usati da sort/filter — lookup O(1) per riga in sort. */
export function buildLavorazioneSchedeSortIndex(
  rows: readonly LavorazioneListRow[],
  schedeStore: LavorazioneSchedeStore,
  fallbackAddetto: string,
): LavorazioneSchedeSortIndex {
  const index: Record<string, LavorazioneSchedeSortRowIndex> = {};
  for (const row of rows) {
    const slice: LavorazioneSchedeStore = schedeStore[row.id] ? { [row.id]: schedeStore[row.id] } : {};
    index[row.id] = {
      macchina: macchinaLabel(row, slice),
      mezzoIdent: mezzoIdent(row, slice),
      cliente: clienteLabel(row, slice),
      utilizzatore: utilizzatoreLabel(row, slice),
      cantiere: cantiereLabel(row, slice),
      addetto: addettoLabel(row, slice, fallbackAddetto),
      oreTotali: lavorazioneOreLavoroSortValue(row, slice),
    };
  }
  return index;
}

export function schedeSortIndexRow(
  index: LavorazioneSchedeSortIndex,
  rowId: string,
): LavorazioneSchedeSortRowIndex | undefined {
  return index[rowId];
}
