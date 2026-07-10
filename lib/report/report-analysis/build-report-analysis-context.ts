import type { ReportModel } from "@/lib/report/build-report-model";
import type { ReportCompareMode, ReportPeriodPreset } from "@/lib/report/date-ranges";
import type { DateRange } from "@/lib/report/date-ranges";
import type { KpiPerformanceModel } from "@/lib/report/kpi-performance/kpi-performance-types";
import type { ReportAnalysisContext } from "@/lib/report/report-analysis/report-analysis-schema";
import type {
  TopClienteReportRow,
  TopMezzoReportRow,
  TopRicambioReportRow,
} from "@/lib/report/report-classifiche";
import type { ReportIntegrityBadgeView } from "@/lib/report/report-integrity-badge-model";

const TOP_N = 5;
const MAX_TREND_MONTHS = 12;
const MAX_CLIENTI_DISP = 12;

function fmtYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed || "—";
  return trimmed.slice(0, max);
}

function tailTrend<T>(rows: T[]): T[] {
  if (rows.length <= MAX_TREND_MONTHS) return rows;
  return rows.slice(-MAX_TREND_MONTHS);
}

function topMezziRows(rows: TopMezzoReportRow[]): ReportAnalysisContext["tops"]["mezzi"] {
  return rows.slice(0, TOP_N).map((r) => ({
    label: clip(r.mezzo.trim() || r.targa.trim() || "—", 120),
    interventi: r.interventi,
  }));
}

function topClientiRows(rows: TopClienteReportRow[]): ReportAnalysisContext["tops"]["clienti"] {
  return rows.slice(0, TOP_N).map((r) => ({
    label: clip(r.cliente.trim() || "—", 120),
    interventi: r.interventi,
  }));
}

function topRicambiRows(rows: TopRicambioReportRow[]): ReportAnalysisContext["tops"]["ricambi"] {
  return rows.slice(0, TOP_N).map((r) => ({
    label: clip(r.nome.trim() || r.codice.trim() || "—", 120),
    qtaUscita: r.qtaUscita,
  }));
}

export type BuildReportAnalysisContextInput = {
  preset: ReportPeriodPreset;
  compareMode: ReportCompareMode;
  filterRange: DateRange;
  compareRange: DateRange | null;
  model: ReportModel;
  perf: KpiPerformanceModel | null;
  integrityView: ReportIntegrityBadgeView;
  tops: {
    mezzi: TopMezzoReportRow[];
    clienti: TopClienteReportRow[];
    ricambi: TopRicambioReportRow[];
  };
  diaryEntries?: readonly { workDate: string; body: string }[];
};

/** Payload KPI ottimizzato per Gemini — nessun dump grezzo, trend troncati, no duplicazioni. */
export function buildReportAnalysisContext(input: BuildReportAnalysisContextInput): ReportAnalysisContext {
  const { preset, compareMode, filterRange, compareRange, model, perf, integrityView, tops } = input;

  const queryErrors = integrityView.queryMeta.filter((q) => q.isError).map((q) => q.source);

  const executive = perf
    ? {
        closedInPeriod: perf.operational.closedInPeriod,
        openCount: perf.operational.openCount,
        avgCloseDays: perf.operational.avgCloseDays,
        avgCloseDaysCompare: perf.operational.avgCloseDaysCompare,
        mezziInOfficina: perf.fleet.mezziInOfficina,
        totalMezzi: perf.fleet.totalMezzi,
        totalMaintenanceCost: perf.economic.totalMaintenanceCost,
        ricambiCostPeriod: perf.economic.ricambiCostPeriod,
        manodoperaCostPeriod: perf.economic.manodoperaCostPeriod,
        manodoperaAvailable: perf.economic.manodoperaAvailable,
      }
    : {
        closedInPeriod: 0,
        openCount: 0,
        avgCloseDays: null,
        avgCloseDaysCompare: null,
        mezziInOfficina: 0,
        totalMezzi: 0,
        totalMaintenanceCost: 0,
        ricambiCostPeriod: 0,
        manodoperaCostPeriod: null,
        manodoperaAvailable: false,
      };

  const monthlyClosed = perf
    ? tailTrend(
        perf.operational.monthlyClosed.map((p) => ({ month: p.monthKey, value: p.value })),
      )
    : [];
  const heuristicFaultsMonthly = perf
    ? tailTrend(
        perf.operational.heuristicFaultsMonthly.map((p) => ({ month: p.monthKey, value: p.value })),
      )
    : [];

  const fleet = perf
    ? {
        mezziOperativiProxy: perf.fleet.mezziOperativiProxy,
        avgDowntimeDays: perf.fleet.avgDowntimeDays,
        guastiByTipo: perf.fleet.guastiByTipo.slice(0, TOP_N).map((g) => ({
          tipo: clip(g.tipo, 80),
          count: g.count,
        })),
        mezziAltaFrequenzaGuasti: perf.fleet.mezziAltaFrequenzaGuasti
          .map((m) => clip(m.label, 120))
          .slice(0, TOP_N),
        disponibilitaPerCliente: perf.fleet.disponibilitaPerCliente.slice(0, MAX_CLIENTI_DISP).map((r) => ({
          cliente: clip(r.cliente, 120),
          totalMezzi: r.totalMezzi,
          mezziInOfficina: r.mezziInOfficina,
          disponibilitaPct: r.disponibilitaPct,
        })),
        peggiorDisponibilita: perf.fleet.peggiorDisponibilita
          ? {
              cliente: clip(perf.fleet.peggiorDisponibilita.cliente, 120),
              disponibilitaPct: perf.fleet.peggiorDisponibilita.disponibilitaPct,
            }
          : null,
      }
    : {
        mezziOperativiProxy: 0,
        avgDowntimeDays: null,
        guastiByTipo: [],
        mezziAltaFrequenzaGuasti: [],
        disponibilitaPerCliente: [],
        peggiorDisponibilita: null,
      };

  const alerts = (perf?.alerts ?? []).map((a) => ({
    id: a.id,
    severity: a.severity,
    title: clip(a.title, 200),
  }));

  const periodKpis = model.kpis.map((k) => ({
    id: k.id,
    label: clip(k.label, 120),
    value: clip(k.value, 64),
  }));

  const compareDetail = model.compareDetail
    ? {
        openedCur: model.compareDetail.openedCur,
        openedPrev: model.compareDetail.openedPrev,
        completedCur: model.compareDetail.completedCur,
        completedPrev: model.compareDetail.completedPrev,
      }
    : undefined;

  const operationalDiary =
    input.diaryEntries
      ?.map((e) => ({
        workDate: e.workDate,
        body: clip(e.body, 400),
      }))
      .filter((e) => e.body.trim().length > 0)
      .slice(0, 62) ?? [];

  return {
    contextVersion: 1,
    meta: {
      preset,
      compareMode,
      periodStart: fmtYmd(filterRange.start),
      periodEnd: fmtYmd(filterRange.end),
      ...(compareRange
        ? { compareStart: fmtYmd(compareRange.start), compareEnd: fmtYmd(compareRange.end) }
        : {}),
    },
    integrity: {
      status: integrityView.status,
      findingCount: integrityView.audit.findings.length,
      manualEntryCount: integrityView.manualEntryCount,
      queryErrors,
    },
    executive,
    trends: { monthlyClosed, heuristicFaultsMonthly },
    fleet,
    alerts,
    periodKpis,
    tops: {
      mezzi: topMezziRows(tops.mezzi),
      clienti: topClientiRows(tops.clienti),
      ricambi: topRicambiRows(tops.ricambi),
    },
    ...(compareDetail ? { compareDetail } : {}),
    ...(operationalDiary.length > 0 ? { operationalDiary } : {}),
  };
}

export function estimateReportAnalysisContextBytes(context: ReportAnalysisContext): number {
  return new TextEncoder().encode(JSON.stringify(context)).length;
}
