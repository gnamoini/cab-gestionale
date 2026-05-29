import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { entrateQtyFromMagazzinoEntry, usciteQtyFromMagazzinoEntry } from "@/lib/magazzino/ricambio-consumo-from-log";
import type { DateRange } from "@/lib/report/date-ranges";
import { isoInRange } from "@/lib/report/date-ranges";

export type MagazzinoProductQtyAgg = { entrate: number; uscite: number };

/** Aggregazione per ricambio nel periodo — stesse regole di `aggregateMagazzinoMonthFromLogs` (no annullati). */
export function aggregateMagazzinoQtyByProductInRange(
  magLog: MagazzinoChangeLogEntry[],
  range: DateRange,
): Map<string, MagazzinoProductQtyAgg> {
  const byId = new Map<string, MagazzinoProductQtyAgg>();
  for (const e of magLog) {
    if (!isoInRange(e.at, range)) continue;
    const cur = byId.get(e.ricambioId) ?? { entrate: 0, uscite: 0 };
    cur.entrate += entrateQtyFromMagazzinoEntry(e);
    cur.uscite += usciteQtyFromMagazzinoEntry(e);
    byId.set(e.ricambioId, cur);
  }
  return byId;
}

/** Somma uscite (Δ scorta negativo) nel periodo — KPI report «Ricambi movimentati». */
export function sumMagazzinoUsciteQtyInRange(magLog: MagazzinoChangeLogEntry[], range: DateRange): number {
  let q = 0;
  for (const e of magLog) {
    if (!isoInRange(e.at, range)) continue;
    q += usciteQtyFromMagazzinoEntry(e);
  }
  return Math.round(q * 10) / 10;
}
