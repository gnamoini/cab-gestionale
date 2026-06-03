import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { MovimentoRicambioRow } from "@/src/types/supabase-tables";

function movementQty(row: MovimentoRicambioRow): number {
  const q = Math.round(Number(row.quantita) || 0);
  return q > 0 ? q : 1;
}

/** Converte un movimento DB in voce log compatibile con aggregatori report (campo Scorta). */
export function movimentoRowToChangeLogEntry(row: MovimentoRicambioRow): MagazzinoChangeLogEntry {
  const q = movementQty(row);
  const isEntrata = row.tipo === "entrata";
  return {
    id: `mov-${row.id}`,
    tipo: "update",
    ricambioId: row.ricambio_id,
    ricambio: "",
    autore: "Sistema",
    at: row.created_at,
    riepilogo: isEntrata ? "entrata" : "uscita",
    changes: [
      {
        campo: "Scorta",
        prima: isEntrata ? "0" : String(q),
        dopo: isEntrata ? String(q) : "0",
      },
    ],
    annullato: false,
  };
}

/** Batch: movimenti reali → log report (ordinati per data desc). */
export function movimentiRowsToMagazzinoChangeLog(rows: readonly MovimentoRicambioRow[]): MagazzinoChangeLogEntry[] {
  return [...rows]
    .map(movimentoRowToChangeLogEntry)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
