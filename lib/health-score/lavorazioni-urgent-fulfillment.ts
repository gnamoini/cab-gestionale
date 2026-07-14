import { isLavorazioneInCorso } from "@/lib/lavorazioni/archived";
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export type UrgentFulfillmentStats = {
  sampleSize: number;
  avgDays: number;
  avgDaysPrev: number | null;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function daysBetween(startIso: string, end: Date | string): number {
  const start = new Date(startIso);
  const endAt = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(endAt.getTime())) return 0;
  return Math.max(0, (endAt.getTime() - start.getTime()) / 86400000);
}

function lavIngressIso(row: LavorazioneListRow): string {
  return row.data_ingresso?.trim() || row.created_at;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Tempo medio sui lavori urgenti: età in coda + giorni di chiusura nel periodo. */
export function computeUrgentFulfillmentStats(input: {
  lavRows: readonly LavorazioneListRow[];
  completate: readonly LavorazioneArchiviata[];
  range: DateRange;
  prevRange: DateRange;
  anchor: Date;
}): UrgentFulfillmentStats {
  const openDays: number[] = [];
  for (const row of input.lavRows) {
    if (row.deleted_at || !isLavorazioneInCorso(row) || row.priorita !== "urgente") continue;
    const days = daysBetween(lavIngressIso(row), input.anchor);
    if (days > 0) openDays.push(days);
  }

  const closedCurDays: number[] = [];
  const closedPrevDays: number[] = [];
  for (const row of input.completate) {
    if (row.prioritaFinale !== "urgente" || !row.dataCompletamento) continue;
    const days = daysBetween(row.dataIngresso, row.dataCompletamento);
    if (days <= 0) continue;
    if (isoInRange(row.dataCompletamento, input.range)) closedCurDays.push(days);
    if (isoInRange(row.dataCompletamento, input.prevRange)) closedPrevDays.push(days);
  }

  const currentValues = [...openDays, ...closedCurDays];
  const avgDays = avg(currentValues) ?? 0;
  const avgDaysPrev = avg(closedPrevDays);

  return {
    sampleSize: currentValues.length,
    avgDays,
    avgDaysPrev,
  };
}

if (process.env.NODE_ENV !== "production") {
  const stats = computeUrgentFulfillmentStats({
    lavRows: [
      {
        id: "open-urgent",
        priorita: "urgente",
        data_ingresso: "2026-06-01",
        created_at: "2026-06-01T00:00:00.000Z",
        stato: "in_lavorazione",
        archived: false,
        deleted_at: null,
      } as LavorazioneListRow,
    ],
    completate: [
      {
        prioritaFinale: "urgente",
        dataIngresso: "2026-05-01",
        dataCompletamento: "2026-05-06",
      } as LavorazioneArchiviata,
    ],
    range: { start: new Date("2026-05-01"), end: new Date("2026-06-30") },
    prevRange: { start: new Date("2026-04-01"), end: new Date("2026-04-30") },
    anchor: new Date("2026-06-15T12:00:00.000Z"),
  });
  if (stats.sampleSize <= 0 || stats.avgDays <= 0) {
    throw new Error("computeUrgentFulfillmentStats self-check failed");
  }
}
