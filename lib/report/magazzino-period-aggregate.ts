import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { entrateQtyFromMagazzinoEntry, usciteQtyFromMagazzinoEntry } from "@/lib/magazzino/ricambio-consumo-from-log";
import type { DateRange } from "@/lib/report/date-ranges";
import { isoInRange } from "@/lib/report/date-ranges";

export type MagazzinoProductQtyAgg = { entrate: number; uscite: number };

/** Aggregazione per ricambio nel periodo — stesse regole di `aggregateMagazzinoMonthFromLogs` (no annullati). */
export function aggregateMagazzinoQtyByProductInRange(
  magLog: readonly MagazzinoChangeLogEntry[],
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
export function sumMagazzinoUsciteQtyInRange(magLog: readonly MagazzinoChangeLogEntry[], range: DateRange): number {
  const byProduct = aggregateMagazzinoQtyByProductInRange(magLog, range);
  let q = 0;
  for (const agg of byProduct.values()) q += agg.uscite;
  return Math.round(q * 10) / 10;
}

/** Somma entrate nel periodo — KPI report «Pezzi in ingresso». */
export function sumMagazzinoEntrateQtyInRange(magLog: readonly MagazzinoChangeLogEntry[], range: DateRange): number {
  const byProduct = aggregateMagazzinoQtyByProductInRange(magLog, range);
  let q = 0;
  for (const agg of byProduct.values()) q += agg.entrate;
  return Math.round(q * 10) / 10;
}
