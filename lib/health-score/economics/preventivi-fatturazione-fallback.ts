import { isPreventivoCountedInEconomicStats } from "@/lib/preventivi/preventivo-stats-eligibility";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";

export function sumPreventiviEconomiciInRange(
  records: readonly PreventivoRecord[],
  range: DateRange,
): number {
  let sum = 0;
  for (const p of records) {
    if (!isPreventivoCountedInEconomicStats(p)) continue;
    const at = p.inviatoAt || p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    sum += p.totaleFinale ?? 0;
  }
  return Math.round(sum * 100) / 100;
}

/** ponytail: fallback solo se fatturazione assente (0), non integrazione parziale. */
export function resolveHealthScoreEconomicAmount(
  invoiceAmount: number,
  preventiviAmount: number,
  usePreventiviFallback: boolean,
): number {
  if (!usePreventiviFallback || invoiceAmount > 0) return invoiceAmount;
  return preventiviAmount;
}
