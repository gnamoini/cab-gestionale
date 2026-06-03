import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import {
  endOfLocalDay,
  isoInRange,
  startOfLocalDay,
  type DateRange,
} from "@/lib/report/date-ranges";
import {
  type ReportManualByMonth,
} from "@/lib/report/lavorazioni-report-selectors";
import {
  intersectDateRanges,
  monthBoundsLocal,
} from "@/lib/magazzino/ricambio-consumo-from-log";
import { pctChange, round1 } from "@/lib/report/pct-utils";
import {
  effectiveReportRangeForYear,
  monthInReportRange,
} from "@/lib/report/report-temporal-filter";
import {
  weekIndexInMonthFromIso,
  weekMapKey,
} from "@/lib/report/report-completate-maps";

export { weekIndexInMonthFromIso } from "@/lib/report/report-completate-maps";

const MONTH_LABELS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;

const MONTH_LABELS_SHORT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"] as const;

export type TemporalWeekBucket = {
  weekIndex: number;
  label: string;
  count: number;
  rangeStart: string;
  rangeEnd: string;
};

export type TemporalMonthRow = {
  monthIndex: number;
  monthKey: string;
  label: string;
  count: number;
  hasManualOverride: boolean;
  inEffectiveRange: boolean;
  trendVsPrevPct: number | null;
  weeks: TemporalWeekBucket[];
};

export type LavorazioniTemporalKpis = {
  total: number;
  avgMonthly: number;
  avgMonthlyCalendar: number;
  activeMonths: number;
  avgWeekly: number;
  activeWeeks: number;
  peakMonth: { monthIndex: number; label: string; count: number } | null;
  peakWeek: { monthKey: string; weekIndex: number; label: string; count: number } | null;
};

export type LavorazioniTemporalModel = {
  months: TemporalMonthRow[];
  kpis: LavorazioniTemporalKpis;
  effectiveRange: DateRange;
  manualMonthKeys: Set<string>;
};

function fmtYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

function weekDayRange(y: number, m0: number, weekIndex: number): { startDay: number; endDay: number } {
  const dim = daysInMonth(y, m0);
  const startDay = (weekIndex - 1) * 7 + 1;
  const endDay = Math.min(dim, weekIndex * 7);
  return { startDay, endDay };
}

function weekBoundsLocal(y: number, m0: number, weekIndex: number): DateRange {
  const { startDay, endDay } = weekDayRange(y, m0, weekIndex);
  return {
    start: startOfLocalDay(new Date(y, m0, startDay)),
    end: endOfLocalDay(new Date(y, m0, endDay)),
  };
}

function weekCountForMonth(y: number, m0: number): number {
  const dim = daysInMonth(y, m0);
  return Math.ceil(dim / 7);
}

function weekLabel(y: number, m0: number, weekIndex: number): string {
  const { startDay, endDay } = weekDayRange(y, m0, weekIndex);
  const moShort = MONTH_LABELS_SHORT[m0];
  return `Sett. ${weekIndex} (${startDay}–${endDay} ${moShort})`;
}

function monthKey(y: number, m0: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

function monthInEffectiveRange(y: number, m0: number, effectiveRange: DateRange): boolean {
  return monthInReportRange(y, m0, effectiveRange);
}

function weekInEffectiveRange(y: number, m0: number, weekIndex: number, effectiveRange: DateRange): boolean {
  const wb = weekBoundsLocal(y, m0, weekIndex);
  return intersectDateRanges(effectiveRange, wb) != null;
}

type WeekKey = string;

export type TemporalPrecomputedMaps = {
  byMonthDb: Map<string, number>;
  byWeek: Map<string, number>;
};

function monthFullyInEffectiveRange(y: number, m0: number, effectiveRange: DateRange): boolean {
  const mb = monthBoundsLocal(y, m0 + 1);
  const inter = intersectDateRanges(effectiveRange, mb);
  if (!inter) return false;
  return inter.start.getTime() === mb.start.getTime() && inter.end.getTime() === mb.end.getTime();
}

function weekFullyInEffectiveRange(y: number, m0: number, weekIndex: number, effectiveRange: DateRange): boolean {
  const wb = weekBoundsLocal(y, m0, weekIndex);
  const inter = intersectDateRanges(effectiveRange, wb);
  if (!inter) return false;
  return inter.start.getTime() === wb.start.getTime() && inter.end.getTime() === wb.end.getTime();
}

function tryAggregateFromPrecomputed(
  precomputed: TemporalPrecomputedMaps,
  selYear: number,
  effectiveRange: DateRange,
): { byMonth: Map<string, number>; byWeek: Map<WeekKey, number> } | null {
  const byMonth = new Map<string, number>();
  const byWeek = new Map<WeekKey, number>();
  const yearPrefix = `${selYear}-`;

  for (let m0 = 0; m0 < 12; m0 += 1) {
    if (!monthInEffectiveRange(selYear, m0, effectiveRange)) continue;
    const mk = monthKey(selYear, m0);
    if (!monthFullyInEffectiveRange(selYear, m0, effectiveRange)) return null;
    byMonth.set(mk, precomputed.byMonthDb.get(mk) ?? 0);

    const weekCount = weekCountForMonth(selYear, m0);
    for (let wi = 1; wi <= weekCount; wi += 1) {
      if (!weekFullyInEffectiveRange(selYear, m0, wi, effectiveRange)) return null;
      const wk = weekMapKey(mk, wi);
      byWeek.set(wk, precomputed.byWeek.get(wk) ?? 0);
    }
  }

  for (const [k] of precomputed.byMonthDb) {
    if (k.startsWith(yearPrefix) && !byMonth.has(k)) {
      const m0 = Number(k.slice(5, 7)) - 1;
      if (monthInEffectiveRange(selYear, m0, effectiveRange)) return null;
    }
  }

  return { byMonth, byWeek };
}

/** Singolo pass su completate: conteggi DB per mese e settimana (solo in effectiveRange). */
function aggregateDbCounts(
  completate: LavorazioneArchiviata[],
  selYear: number,
  effectiveRange: DateRange,
): { byMonth: Map<string, number>; byWeek: Map<WeekKey, number> } {
  const byMonth = new Map<string, number>();
  const byWeek = new Map<WeekKey, number>();

  for (const x of completate) {
    if (!x.dataCompletamento) continue;
    if (!isoInRange(x.dataCompletamento, effectiveRange)) continue;

    const d = new Date(x.dataCompletamento);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getFullYear() !== selYear) continue;

    const m0 = d.getMonth();
    const mk = monthKey(selYear, m0);
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + 1);

    const wi = weekIndexInMonthFromIso(x.dataCompletamento);
    if (wi == null) continue;
    const wk = weekMapKey(mk, wi);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1);
  }

  return { byMonth, byWeek };
}

export function buildLavorazioniTemporalModel(
  completate: LavorazioneArchiviata[],
  selYear: number,
  filterRange: DateRange,
  manualByMonth?: ReportManualByMonth,
  precomputed?: TemporalPrecomputedMaps,
): LavorazioniTemporalModel {
  const effectiveRange = effectiveReportRangeForYear(filterRange, selYear);

  const manualKeys = new Set(manualByMonth ? [...manualByMonth.keys()].filter((k) => k.startsWith(`${selYear}-`)) : []);
  const fromMaps = precomputed ? tryAggregateFromPrecomputed(precomputed, selYear, effectiveRange) : null;
  const { byMonth, byWeek } = fromMaps ?? aggregateDbCounts(completate, selYear, effectiveRange);

  const months: TemporalMonthRow[] = [];
  let prevCount: number | null = null;

  for (let m0 = 0; m0 < 12; m0 += 1) {
    const mk = monthKey(selYear, m0);
    const inRange = monthInEffectiveRange(selYear, m0, effectiveRange);
    const hasManual = manualKeys.has(mk);

    let count = 0;
    if (inRange) {
      if (hasManual && manualByMonth?.has(mk)) {
        count = manualByMonth.get(mk)!;
      } else {
        count = byMonth.get(mk) ?? 0;
      }
    }

    const trendVsPrevPct =
      prevCount != null && prevCount > 0 && inRange ? pctChange(prevCount, count) : null;
    if (inRange) prevCount = count;

    const weekCount = weekCountForMonth(selYear, m0);
    const weeks: TemporalWeekBucket[] = [];
    for (let wi = 1; wi <= weekCount; wi += 1) {
      const wb = weekBoundsLocal(selYear, m0, wi);
      const weekActive = weekInEffectiveRange(selYear, m0, wi, effectiveRange);
      const dbCount = byWeek.get(weekMapKey(mk, wi)) ?? 0;
      weeks.push({
        weekIndex: wi,
        label: weekLabel(selYear, m0, wi),
        count: weekActive ? dbCount : 0,
        rangeStart: fmtYmd(wb.start),
        rangeEnd: fmtYmd(wb.end),
      });
    }

    months.push({
      monthIndex: m0,
      monthKey: mk,
      label: MONTH_LABELS[m0]!,
      count,
      hasManualOverride: hasManual,
      inEffectiveRange: inRange,
      trendVsPrevPct,
      weeks,
    });
  }

  const activeMonths = months.filter((m) => m.inEffectiveRange && m.count > 0);
  const total = activeMonths.reduce((s, m) => s + m.count, 0);

  let peakMonth: LavorazioniTemporalKpis["peakMonth"] = null;
  for (const m of activeMonths) {
    if (!peakMonth || m.count > peakMonth.count) {
      peakMonth = { monthIndex: m.monthIndex, label: m.label, count: m.count };
    }
  }

  const activeWeekEntries: { monthKey: string; weekIndex: number; label: string; count: number }[] = [];
  for (const m of months) {
    if (!m.inEffectiveRange) continue;
    for (const w of m.weeks) {
      if (w.count > 0) {
        activeWeekEntries.push({
          monthKey: m.monthKey,
          weekIndex: w.weekIndex,
          label: `${m.label} · ${w.label}`,
          count: w.count,
        });
      }
    }
  }

  let peakWeek: LavorazioniTemporalKpis["peakWeek"] = null;
  for (const w of activeWeekEntries) {
    if (!peakWeek || w.count > peakWeek.count) {
      peakWeek = {
        monthKey: w.monthKey,
        weekIndex: w.weekIndex,
        label: w.label,
        count: w.count,
      };
    }
  }

  const activeMonthsCount = activeMonths.length;
  const activeWeeksCount = activeWeekEntries.length;

  const kpis: LavorazioniTemporalKpis = {
    total,
    avgMonthly: activeMonthsCount > 0 ? round1(total / activeMonthsCount) : 0,
    avgMonthlyCalendar: round1(total / 12),
    activeMonths: activeMonthsCount,
    avgWeekly: activeWeeksCount > 0 ? round1(total / activeWeeksCount) : 0,
    activeWeeks: activeWeeksCount,
    peakMonth,
    peakWeek,
  };

  return {
    months,
    kpis,
    effectiveRange,
    manualMonthKeys: manualKeys,
  };
}
