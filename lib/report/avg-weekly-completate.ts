import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { intersectDateRanges } from "@/lib/magazzino/ricambio-consumo-from-log";
import {
  endOfLocalDay,
  startOfLocalDay,
  type DateRange,
} from "@/lib/report/date-ranges";
import type { ReportManualByMonth } from "@/lib/report/lavorazioni-report-selectors";
import { monthKeysOverlappingRange } from "@/lib/report/month-keys";
import { weekMapKey } from "@/lib/report/report-completate-maps";

function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

function weekCountForMonth(y: number, m0: number): number {
  return Math.ceil(daysInMonth(y, m0) / 7);
}

function weekBoundsLocal(y: number, m0: number, weekIndex: number): DateRange {
  const startDay = (weekIndex - 1) * 7 + 1;
  const endDay = Math.min(daysInMonth(y, m0), weekIndex * 7);
  return {
    start: startOfLocalDay(new Date(y, m0, startDay)),
    end: endOfLocalDay(new Date(y, m0, endDay)),
  };
}

function weekOverlapsRange(y: number, m0: number, weekIndex: number, range: DateRange): boolean {
  return intersectDateRanges(range, weekBoundsLocal(y, m0, weekIndex)) != null;
}

/** Chiavi `YYYY-MM#weekIndex` per ogni settimana (1–5) del mese che interseca il periodo. */
export function enumerateWeekKeysOverlappingRange(range: DateRange): string[] {
  const keys: string[] = [];
  for (const mk of monthKeysOverlappingRange(range)) {
    const y = Number(mk.slice(0, 4));
    const m0 = Number(mk.slice(5, 7)) - 1;
    if (!Number.isFinite(y) || !Number.isFinite(m0)) continue;
    const wc = weekCountForMonth(y, m0);
    for (let wi = 1; wi <= wc; wi += 1) {
      if (weekOverlapsRange(y, m0, wi, range)) keys.push(weekMapKey(mk, wi));
    }
  }
  return keys;
}

export type AvgWeeklyCompletateResult = {
  /** Media aritmetica su tutte le settimane del periodo (incluse quelle a zero). */
  avg: number;
  weekCount: number;
  /** Somma dei conteggi settimanali usati per la media. */
  weeklySum: number;
};

/**
 * Media settimanale chiusure nel periodo: somma conteggi per settimana ÷ N settimane nel filtro.
 * Mesi con override manuale: il totale mensile è ripartito in parti uguali sulle settimane del mese nel periodo.
 */
export function avgWeeklyCompletateInRange(
  range: DateRange,
  byWeek: Map<string, number>,
  completate: readonly LavorazioneArchiviata[],
  manualByMonth?: ReportManualByMonth,
): AvgWeeklyCompletateResult {
  const weekKeys = enumerateWeekKeysOverlappingRange(range);
  if (weekKeys.length === 0) return { avg: 0, weekCount: 0, weeklySum: 0 };

  let sum = 0;
  const manualWeekKeys = new Set<string>();

  if (manualByMonth && manualByMonth.size > 0) {
    for (const mk of monthKeysOverlappingRange(range)) {
      const manual = manualByMonth.get(mk);
      if (manual == null || manual === 0) continue;
      const y = Number(mk.slice(0, 4));
      const m0 = Number(mk.slice(5, 7)) - 1;
      const weeksInRange: number[] = [];
      const wc = weekCountForMonth(y, m0);
      for (let wi = 1; wi <= wc; wi += 1) {
        if (weekOverlapsRange(y, m0, wi, range)) weeksInRange.push(wi);
      }
      if (weeksInRange.length === 0) continue;
      const perWeek = manual / weeksInRange.length;
      for (const wi of weeksInRange) {
        const wk = weekMapKey(mk, wi);
        sum += perWeek;
        manualWeekKeys.add(wk);
      }
    }
  }

  for (const wk of weekKeys) {
    if (manualWeekKeys.has(wk)) continue;
    sum += byWeek.get(wk) ?? 0;
  }

  const avg = Math.round((sum / weekKeys.length) * 10) / 10;
  return { avg, weekCount: weekKeys.length, weeklySum: Math.round(sum) };
}
