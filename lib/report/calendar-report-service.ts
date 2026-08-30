import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  compareRangeFor,
  dayRangeFromYmd,
  deltaPct,

  isoInRange,
  monthRangeFromKey,

  weekRangeFromYmd,
  ymdFromDate,
  type DateRange,
} from "@/lib/report/date-ranges";
import { buildKpiPerformanceModel } from "@/lib/report/kpi-performance/build-kpi-performance-model";
import type { KpiPerformanceAlert } from "@/lib/report/kpi-performance/kpi-performance-types";
import {
  countCompletedInRange,
  countOpenedInRange,
  type ReportManualByMonth,
} from "@/lib/report/lavorazioni-report-selectors";
import type { ReportAnalysisOutput } from "@/lib/report/report-analysis/report-analysis-schema";
import type { ReportIntegrityQueryMeta } from "@/lib/report/report-data-integrity-layer";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import type { AssetTimelineProjectionRow } from "@/src/types/supabase-tables";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import {
  lifecyclePriorityRank,
  mapTimelineRowToCalendarEvent,
  type AssetLifecycleKpiModel,
} from "@/lib/report/asset-lifecycle/build-asset-lifecycle-kpi-model";

export type CalendarOperationalStatus = "active" | "closed" | "partial";

export type CalendarDaySummary = {
  date: string;
  entriesCount: number;
  exitsCount: number;
  operationalStatus: CalendarOperationalStatus;
  kpis: {
    vehiclesActive?: number;
    averageDwellTime?: number;
    anomaliesCount?: number;
  };
};

export type CalendarWeekSummary = {
  weekStart: string;
  weekEnd: string;
  entriesCount: number;
  exitsCount: number;
  entriesTrendPct: number | null;
  exitsTrendPct: number | null;
  anomaliesCount: number;
};

export type CalendarEventRow = {
  id: string;
  importance: number;
  label: string;
  detail?: string;
  at?: string;
  eventDomain?: "operational" | "lifecycle";
  eventCategory?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  assetRef?: { kind: "mezzo" | "attrezzatura"; id: string };
};

export type CalendarLifecycleFilters = {
  showOperational?: boolean;
  showLifecycle?: boolean;
  lifecycleCategories?: string[];
  minPriority?: "low" | "medium" | "high" | "urgent";
};

export type CalendarInsightsResult = {
  insights: string[];
  source: "ai" | "deterministic";
};

export type CalendarReportServiceInput = {
  anchor: Date;
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  completate: LavorazioneArchiviata[];
  manualByMonth?: ReportManualByMonth;
  mezzi: MezzoGestito[];
  magazzino: RicambioMagazzino[];
  magLog: MagazzinoChangeLogEntry[];
  lavRows: readonly LavorazioneListRow[];
  semanticIndex: ReportSemanticIndex;
  queryMeta: readonly ReportIntegrityQueryMeta[];
  lifecycleTimeline?: AssetTimelineProjectionRow[];
  lifecycleKpi?: AssetLifecycleKpiModel | null;
  lifecycleFilters?: CalendarLifecycleFilters;
};

function hasQueryErrors(queryMeta: readonly ReportIntegrityQueryMeta[]): boolean {
  return queryMeta.some((q) => q.isError);
}

function resolveOperationalStatus(
  entries: number,
  exits: number,
  partial: boolean,
): CalendarOperationalStatus {
  if (partial) return "partial";
  if (entries > 0 || exits > 0) return "active";
  return "closed";
}

function buildPerfForRange(input: CalendarReportServiceInput, range: DateRange) {
  const compareRange = compareRangeFor(range, "prev_period");
  return buildKpiPerformanceModel({
    anchor: input.anchor,
    range,
    compareRange,
    attive: input.attive,
    completate: input.completate,
    mezzi: input.mezzi,
    magazzino: input.magazzino,
    magLog: input.magLog,
    magazzinoRows: input.magazzino.map((p) => ({
      id: p.id,
      costo: p.prezzoFornitoreOriginale,
    })) as import("@/src/types/supabase-tables").MagazzinoRicambioRow[],
    lavRows: input.lavRows,
    semanticIndex: input.semanticIndex,
    schedeStore: null,
    schedeLoaded: false,
    costoOrario: 48,
  });
}

export function getDaySummary(input: CalendarReportServiceInput, ymd: string): CalendarDaySummary | null {
  const range = dayRangeFromYmd(ymd);
  if (!range) return null;

  const entriesCount = countOpenedInRange(input.attive, input.storico, range);
  const exitsCount = countCompletedInRange(input.completate, range, input.manualByMonth);
  const partial = hasQueryErrors(input.queryMeta);
  const perf = buildPerfForRange(input, range);

  return {
    date: ymd,
    entriesCount,
    exitsCount,
    operationalStatus: resolveOperationalStatus(entriesCount, exitsCount, partial),
    kpis: {
      vehiclesActive: perf.fleet.mezziInOfficina,
      averageDwellTime: perf.operational.avgCloseDays ?? undefined,
      anomaliesCount: perf.alerts.length,
    },
  };
}

export function getWeekSummary(input: CalendarReportServiceInput, weekStartYmd: string): CalendarWeekSummary | null {
  const range = weekRangeFromYmd(weekStartYmd);
  if (!range) return null;

  const entriesCount = countOpenedInRange(input.attive, input.storico, range);
  const exitsCount = countCompletedInRange(input.completate, range, input.manualByMonth);
  const compareRange = compareRangeFor(range, "prev_period");
  const prevEntries = compareRange
    ? countOpenedInRange(input.attive, input.storico, compareRange)
    : 0;
  const prevExits = compareRange
    ? countCompletedInRange(input.completate, compareRange, input.manualByMonth)
    : 0;
  const perf = buildPerfForRange(input, range);

  return {
    weekStart: ymdFromDate(range.start),
    weekEnd: ymdFromDate(range.end),
    entriesCount,
    exitsCount,
    entriesTrendPct: deltaPct(entriesCount, prevEntries),
    exitsTrendPct: deltaPct(exitsCount, prevExits),
    anomaliesCount: perf.alerts.length,
  };
}

function alertImportance(a: KpiPerformanceAlert): number {
  if (a.severity === "critical") return 90;
  if (a.severity === "warning") return 70;
  return 50;
}

function priorityMeetsMin(
  priority: CalendarEventRow["priority"],
  min?: CalendarLifecycleFilters["minPriority"],
): boolean {
  if (!min || min === "low") return true;
  const rank = (p: string) => lifecyclePriorityRank(p);
  return rank(priority ?? "low") >= rank(min);
}

function buildLifecycleDayEvents(
  input: CalendarReportServiceInput,
  range: DateRange,
): CalendarEventRow[] {
  const filters = input.lifecycleFilters ?? { showLifecycle: true };
  if (filters.showLifecycle === false || !input.lifecycleTimeline?.length) return [];

  const cats = filters.lifecycleCategories;
  return input.lifecycleTimeline
    .filter((row) => isoInRange(row.event_at, range))
    .filter((row) => !cats?.length || cats.includes(row.event_category))
    .map(mapTimelineRowToCalendarEvent)
    .filter((ev) => priorityMeetsMin(ev.priority, filters.minPriority));
}

function buildDayEvents(input: CalendarReportServiceInput, range: DateRange): CalendarEventRow[] {
  const filters = input.lifecycleFilters ?? { showOperational: true, showLifecycle: true };
  const events: CalendarEventRow[] = [];

  if (filters.showOperational !== false) {
    const perf = buildPerfForRange(input, range);

    for (const alert of perf.alerts) {
      events.push({
        id: `alert-${alert.id}`,
        importance: alertImportance(alert),
        label: alert.title,
        detail: alert.detail,
        eventDomain: "operational",
        eventCategory: "alert",
        priority: alert.severity === "critical" ? "urgent" : alert.severity === "warning" ? "high" : "medium",
      });
    }

    for (const row of input.lavRows) {
      const ingresso = row.data_ingresso;
      if (!ingresso || !isoInRange(ingresso, range)) continue;
      const note = row.note?.trim();
      if (note) {
        const mezzo =
          row.mezzo?.targa?.trim() ||
          row.mezzo?.utilizzatore?.trim() ||
          row.mezzo?.cliente?.trim() ||
          row.codice?.trim() ||
          "Lavorazione";
        events.push({
          id: `anomaly-${row.id}`,
          importance: 75,
          label: `Anomalia: ${mezzo}`,
          detail: note.slice(0, 200),
          at: ingresso,
          eventDomain: "operational",
          eventCategory: "anomaly",
          priority: "high",
        });
      }
    }

    for (const x of input.attive) {
      if (!isoInRange(x.dataIngresso, range)) continue;
      events.push({
        id: `in-${x.id}`,
        importance: 55,
        label: `Ingresso: ${x.macchina || x.targa || x.codice || "—"}`,
        detail: x.cliente?.trim() || undefined,
        at: x.dataIngresso,
        eventDomain: "operational",
        eventCategory: "ingresso",
        priority: "medium",
      });
    }

    for (const x of input.storico) {
      if (isoInRange(x.dataIngresso, range)) {
        events.push({
          id: `in-st-${x.id}`,
          importance: 50,
          label: `Ingresso: ${x.macchina || x.targa || x.codice || "—"}`,
          detail: x.cliente?.trim() || undefined,
          at: x.dataIngresso,
          eventDomain: "operational",
          eventCategory: "ingresso",
          priority: "medium",
        });
      }
    }

    for (const x of input.completate) {
      if (!x.dataCompletamento || !isoInRange(x.dataCompletamento, range)) continue;
      events.push({
        id: `out-${x.id}`,
        importance: 45,
        label: `Uscita: ${x.macchina || x.targa || x.codice || "—"}`,
        detail: x.cliente?.trim() || undefined,
        at: x.dataCompletamento,
        eventDomain: "operational",
        eventCategory: "uscita",
        priority: "medium",
      });
    }
  }

  events.push(...buildLifecycleDayEvents(input, range));

  return events
    .sort((a, b) => b.importance - a.importance || (b.at ?? "").localeCompare(a.at ?? ""))
    .slice(0, 20);
}

export function getDayEvents(input: CalendarReportServiceInput, ymd: string): CalendarEventRow[] {
  const range = dayRangeFromYmd(ymd);
  if (!range) return [];
  return buildDayEvents(input, range);
}

export function insightsFromAnalysisOutput(output: ReportAnalysisOutput | null | undefined): string[] {
  if (!output) return [];
  const lines: string[] = [];
  for (const p of output.prioritaImmediate) {
    lines.push(`${p.azione} (${p.entro})`);
  }
  for (const a of output.anomalieRilevate) {
    lines.push(`${a.titolo}: ${a.dettaglio}`);
  }
  for (const s of output.suggerimentiOperativi) {
    if (s.priorita === "alta") lines.push(`${s.azione} — ${s.motivazione}`);
  }
  for (const t of output.trendPositivi) {
    lines.push(`${t.titolo}: ${t.dettaglio}`);
  }
  return lines.slice(0, 5);
}

export function getDeterministicInsights(input: CalendarReportServiceInput, ymd: string): CalendarInsightsResult {
  const range = dayRangeFromYmd(ymd);
  if (!range) return { insights: [], source: "deterministic" };
  const perf = buildPerfForRange(input, range);
  const insights = perf.alerts.map((a) => `${a.title}: ${a.detail}`);
  if (input.lifecycleKpi?.deterministicInsights.length) {
    insights.push(...input.lifecycleKpi.deterministicInsights);
  }
  return { insights: insights.slice(0, 8), source: "deterministic" };
}

export function getWeekDeterministicInsights(
  input: CalendarReportServiceInput,
  weekStartYmd: string,
): CalendarInsightsResult {
  const range = weekRangeFromYmd(weekStartYmd);
  if (!range) return { insights: [], source: "deterministic" };
  const perf = buildPerfForRange(input, range);
  const summary = getWeekSummary(input, weekStartYmd);
  const lines: string[] = [];
  if (summary) {
    lines.push(`Settimana: ${summary.entriesCount} ingressi, ${summary.exitsCount} uscite`);
    if (summary.exitsTrendPct != null) {
      const dir = summary.exitsTrendPct >= 0 ? "↑" : "↓";
      lines.push(`Trend uscite vs sett. prec.: ${dir} ${Math.abs(summary.exitsTrendPct)}%`);
    }
  }
  for (const a of perf.alerts) {
    lines.push(`${a.title}: ${a.detail}`);
  }
  return { insights: lines.slice(0, 5), source: "deterministic" };
}

/** Single pass sul mese — dot calendario senza N+1. */
export function buildMonthHasDataMap(
  input: CalendarReportServiceInput,
  monthKey: string,
): Record<string, boolean> {
  const range = monthRangeFromKey(monthKey);
  const out: Record<string, boolean> = {};
  if (!range) return out;

  const mark = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()) || !isoInRange(iso, range)) return;
    out[ymdFromDate(d)] = true;
  };

  for (const x of input.attive) mark(x.dataIngresso);
  for (const x of input.storico) mark(x.dataIngresso);
  for (const x of input.completate) {
    if (x.dataCompletamento) mark(x.dataCompletamento);
  }

  if (input.lifecycleTimeline?.length) {
    for (const row of input.lifecycleTimeline) {
      if (row.event_category === "compliance_due" || row.event_category === "assignment_start") {
        mark(row.event_at);
      }
    }
  }

  return out;
}

/** Chiave settimana (lun) per una data YMD. */
export function weekStartYmdFromYmd(ymd: string): string | null {
  const range = weekRangeFromYmd(ymd);
  if (!range) return null;
  return ymdFromDate(range.start);
}

/** Gruppi settimana (7 celle) dalla griglia mensile. */
export function groupCellsByWeek<T extends { ymd: string }>(cells: T[]): T[][] {
  const weeks: T[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function operationalStatusLabel(status: CalendarOperationalStatus): string {
  if (status === "active") return "Giorno attivo";
  if (status === "partial") return "Dati parziali";
  return "Giorno chiuso";
}

export function weekRangeLabel(weekStart: string, weekEnd: string): string {
  const fmt = (ymd: string) => {
    const d = dayRangeFromYmd(ymd)?.start;
    return d ? d.toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : ymd;
  };
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

/** Espone range per preset report da calendario. */
export function reportDeepLinkForDay(ymd: string): { preset: "custom"; customFrom: string; customTo: string } {
  return { preset: "custom", customFrom: ymd, customTo: ymd };
}

export function reportDeepLinkForWeek(weekStartYmd: string): {
  preset: "custom";
  customFrom: string;
  customTo: string;
} {
  const range = weekRangeFromYmd(weekStartYmd);
  if (!range) return { preset: "custom", customFrom: weekStartYmd, customTo: weekStartYmd };
  return {
    preset: "custom",
    customFrom: ymdFromDate(range.start),
    customTo: ymdFromDate(range.end),
  };
}

/** Alias per API plan — insight deterministico giorno. */
export function getDayInsights(input: CalendarReportServiceInput, ymd: string): CalendarInsightsResult {
  return getDeterministicInsights(input, ymd);
}

/** Alias per API plan — insight deterministico settimana (AI via hook client). */
export function getWeekInsights(input: CalendarReportServiceInput, weekStartYmd: string): CalendarInsightsResult {
  return getWeekDeterministicInsights(input, weekStartYmd);
}

export { dayRangeFromYmd, weekRangeFromYmd };
