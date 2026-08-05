import type { LogModificaWithProfileRow } from "@/src/types/supabase-tables";

const LAVORAZIONI_ENTITA = new Set(["lavorazioni", "scheda_lavorazione"]);
const FATTURAZIONE_ENTITA = new Set(["invoices", "invoice_payments"]);

export type SplitActivityFeedLogs = {
  lavorazioni: LogModificaWithProfileRow[];
  magazzino: LogModificaWithProfileRow[];
  movimenti: LogModificaWithProfileRow[];
  preventivi: LogModificaWithProfileRow[];
  ddt: LogModificaWithProfileRow[];
  fatturazione: LogModificaWithProfileRow[];
};

/** ACTIVITY_FEED — partiziona righe RPC per dominio control-tower. */
export function splitActivityFeedLogs(rows: readonly LogModificaWithProfileRow[]): SplitActivityFeedLogs {
  const out: SplitActivityFeedLogs = {
    lavorazioni: [],
    magazzino: [],
    movimenti: [],
    preventivi: [],
    ddt: [],
    fatturazione: [],
  };
  for (const row of rows) {
    if (LAVORAZIONI_ENTITA.has(row.entita)) {
      out.lavorazioni.push(row);
      continue;
    }
    if (row.entita === "magazzino_ricambi") {
      out.magazzino.push(row);
      continue;
    }
    if (row.entita === "movimenti_ricambi") {
      out.movimenti.push(row);
      continue;
    }
    if (row.entita === "preventivi") {
      out.preventivi.push(row);
      continue;
    }
    if (row.entita === "ddt_documents") {
      out.ddt.push(row);
      continue;
    }
    if (FATTURAZIONE_ENTITA.has(row.entita)) {
      out.fatturazione.push(row);
    }
  }
  return out;
}
