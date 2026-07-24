import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import type { LavorazioneRow } from "@/src/types/supabase-tables";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Somma `actual_labor_hours` denormalizzate per lavorazioni completate nel periodo. */
export function sumActualLaborHoursInRange(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
  lavRows: readonly Pick<LavorazioneRow, "id" | "actual_labor_hours">[],
): number {
  const byId = new Map(lavRows.map((r) => [r.id, r]));
  let total = 0;
  for (const c of completate) {
    if (!c.dataCompletamento || !isoInRange(c.dataCompletamento, range)) continue;
    const hours = Number(byId.get(c.id)?.actual_labor_hours ?? 0);
    if (Number.isFinite(hours) && hours > 0) total += hours;
  }
  return round1(total);
}
