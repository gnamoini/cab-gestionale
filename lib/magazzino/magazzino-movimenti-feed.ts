import { buildLogModificaSummary, modificheToModificaRiga } from "@/lib/gestionale-log/log-summary";
import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import type { MagazzinoLogFeedItem } from "@/lib/magazzino/magazzino-log-feed-merge";
import {
  formatRicambioLogLabel,
  movimentoRowDedupKey,
} from "@/lib/magazzino/ricambio-log-label";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";

function movementQty(row: MovimentoRicambioRow): number {
  const q = Math.round(Number(row.quantita) || 0);
  return q > 0 ? q : 1;
}

function movimentoToViewModel(
  row: MovimentoRicambioRow,
  label: string,
): GestionaleLogViewModel {
  const tipo = row.tipo === "uscita" ? "SCARICO MAGAZZINO" : "CARICO MAGAZZINO";
  const qty = movementQty(row);
  const summary = buildLogModificaSummary({
    entita: "movimenti_ricambi",
    entita_id: row.id,
    azione: "CREATE",
    payload: {
      ricambio_id: row.ricambio_id,
      quantita_before: row.tipo === "entrata" ? 0 : qty,
      quantita_after: row.tipo === "entrata" ? qty : 0,
      delta: row.tipo === "entrata" ? qty : -qty,
      movimento_id: row.id,
      context: { entityLabel: label, oggetto: label },
    },
  });
  return {
    tone: summary.tone,
    tipoRiga: tipo,
    oggettoRiga: label,
    modificaRiga: modificheToModificaRiga(summary.modifiche),
    autore: "Sistema",
    atIso: row.created_at,
  };
}

/** Converte righe ledger `movimenti_ricambi` in voci feed magazzino (SSOT quantitativo). */
export function movimentiRowsToLogFeedItems(
  rows: readonly MovimentoRicambioRow[],
  prodottiById: ReadonlyMap<string, RicambioMagazzino>,
): MagazzinoLogFeedItem[] {
  return rows.map((row) => {
    const ric = prodottiById.get(row.ricambio_id);
    const label = formatRicambioLogLabel(ric, row.ricambio_id);
    return {
      id: `mov-row:${row.id}`,
      source: "server" as const,
      ricambioId: row.ricambio_id,
      vm: movimentoToViewModel(row, label),
      movimentoId: row.id,
      atMs: new Date(row.created_at).getTime(),
      dedupKey: movimentoRowDedupKey(row),
    };
  });
}
