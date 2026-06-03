/**
 * Report Semantic Index — unico layer di interpretazione metriche lavorazioni/completate.
 * Input: dataset già validato da ReportDataIntegrityLayer (no query aggiuntive).
 */
import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { DateRange } from "@/lib/report/date-ranges";
import { buildLavorazioniTemporalModel } from "@/lib/report/lavorazioni-temporal-analysis";
import type { LavorazioniTemporalModel } from "@/lib/report/lavorazioni-temporal-analysis";
import { avgWeeklyCompletateInRange } from "@/lib/report/avg-weekly-completate";
import {
  avgCloseDays,
  countCompletedInRange,
  sparkFromDailyCompletions,
  type ReportManualByMonth,
} from "@/lib/report/lavorazioni-report-selectors";
import { buildCompletateDbMaps, mergeManualMonthMap } from "@/lib/report/report-completate-maps";
import { buildLavorazioniYearMatrix } from "@/lib/report/lavorazioni-year-matrix";
import type { LavorazioniYearRow } from "@/lib/report/lavorazioni-year-matrix";
import { pctChange, round1 } from "@/lib/report/pct-utils";
import { applyYearMatrixFilterRange, type YearMatrixFilterMode } from "@/lib/report/report-temporal-filter";
import {
  buildTopClientiPeriodo,
  buildTopMezziPeriodo,
  type TopClienteReportRow,
  type TopMezzoReportRow,
} from "@/lib/report/report-classifiche";

export type ReportSemanticSource = {
  completate: LavorazioneArchiviata[];
  manualByMonth?: ReportManualByMonth;
  mezzi: MezzoGestito[];
};

export type ReportLavorazioniTrend = {
  monthOverMonthPct: Map<string, number | null>;
  yearOverYearPct: Map<number, number | null>;
};

export type ReportSemanticIndex = {
  completateByMonth: Map<string, number>;
  completateByMonthDb: Map<string, number>;
  completateByWeek: Map<string, number>;
  trendLavorazioni: ReportLavorazioniTrend;

  completateTotal(range: DateRange): number;
  /** Media chiusure per settimana su tutte le settimane del periodo (settimane calendario nel mese). */
  avgWeeklyCompletate(range: DateRange): number;
  weekCountInRange(range: DateRange): number;
  sparkSeries(end: Date): number[];
  tempoMedio(range: DateRange): number;
  topMezzi(range: DateRange): TopMezzoReportRow[];
  topClienti(range: DateRange): TopClienteReportRow[];

  buildYearMatrix(
    anchor: Date,
    filterRange?: DateRange,
  ): {
    rows: LavorazioniYearRow[];
    monthLabels: readonly string[];
    hasAnyData: boolean;
    manualMonthKeys: Set<string>;
    matrixMode: YearMatrixFilterMode;
    forecastRows: LavorazioniYearRow[];
  };
  buildTemporalModel(selYear: number, filterRange: DateRange): LavorazioniTemporalModel;
};

function buildMonthOverMonthTrend(completateByMonth: Map<string, number>): Map<string, number | null> {
  const keys = [...completateByMonth.keys()].sort();
  const out = new Map<string, number | null>();
  let prevCount: number | null = null;

  for (const mk of keys) {
    const count = completateByMonth.get(mk) ?? 0;
    out.set(mk, prevCount != null && prevCount > 0 ? pctChange(prevCount, count) : null);
    prevCount = count;
  }

  return out;
}

function buildYearOverYearTrend(completateByMonth: Map<string, number>): Map<number, number | null> {
  const yearTotals = new Map<number, number>();
  for (const [mk, count] of completateByMonth) {
    const y = Number(mk.slice(0, 4));
    if (!Number.isFinite(y)) continue;
    yearTotals.set(y, (yearTotals.get(y) ?? 0) + count);
  }

  const years = [...yearTotals.keys()].sort((a, b) => a - b);
  const out = new Map<number, number | null>();
  let prevTotal: number | null = null;

  for (const y of years) {
    const total = yearTotals.get(y) ?? 0;
    out.set(y, prevTotal != null && prevTotal > 0 ? pctChange(prevTotal, total) : null);
    prevTotal = total;
  }

  return out;
}

export function buildReportSemanticIndex(source: ReportSemanticSource): ReportSemanticIndex {
  const { completate, manualByMonth, mezzi } = source;
  const { byMonth: completateByMonthDb, byWeek: completateByWeek } = buildCompletateDbMaps(completate);
  const completateByMonth = mergeManualMonthMap(completateByMonthDb, manualByMonth);
  const trendLavorazioni: ReportLavorazioniTrend = {
    monthOverMonthPct: buildMonthOverMonthTrend(completateByMonth),
    yearOverYearPct: buildYearOverYearTrend(completateByMonth),
  };

  return {
    completateByMonth,
    completateByMonthDb,
    completateByWeek,
    trendLavorazioni,

    completateTotal(range) {
      return countCompletedInRange(completate, range, manualByMonth);
    },

    avgWeeklyCompletate(range) {
      return avgWeeklyCompletateInRange(range, completateByWeek, completate, manualByMonth).avg;
    },

    weekCountInRange(range) {
      return avgWeeklyCompletateInRange(range, completateByWeek, completate, manualByMonth).weekCount;
    },

    sparkSeries(end) {
      return sparkFromDailyCompletions(completate, end);
    },

    tempoMedio(range) {
      return avgCloseDays(completate, range);
    },

    topMezzi(range) {
      return buildTopMezziPeriodo(mezzi, completate, range);
    },

    topClienti(range) {
      return buildTopClientiPeriodo(completate, range);
    },

    buildYearMatrix(anchor, filterRange) {
      const base = buildLavorazioniYearMatrix(completate, anchor, manualByMonth, completateByMonth);
      if (!filterRange) {
        return { ...base, matrixMode: "full_history" as const, forecastRows: base.rows };
      }
      const applied = applyYearMatrixFilterRange(base.rows, filterRange);
      return {
        ...base,
        rows: applied.rows,
        matrixMode: applied.mode,
        forecastRows: base.rows,
      };
    },

    buildTemporalModel(selYear, filterRange) {
      return buildLavorazioniTemporalModel(completate, selYear, filterRange, manualByMonth, {
        byMonthDb: completateByMonthDb,
        byWeek: completateByWeek,
      });
    },
  };
}

export { buildCompletateDbMaps, mergeManualMonthMap } from "@/lib/report/report-completate-maps";
