import { registerHealthKpi } from "@/lib/health-score/registry/kpi-registry";
import type { HealthKpiDefinition } from "@/lib/health-score/registry/types";
import { tanhLevelNormalizer, tanhTrendNormalizer } from "@/lib/health-score/normalizers/tanh-normalizer";
import type { KpiContext, KpiRawValue } from "@/lib/health-score/types";

function pctRaw(current: number, total: number, prevCurrent: number, prevTotal: number): KpiRawValue {
  const cur = total > 0 ? (current / total) * 100 : 0;
  const prev = prevTotal > 0 ? (prevCurrent / prevTotal) * 100 : null;
  return { current: Math.round(cur * 10) / 10, previous: prev, sampleSize: total };
}

function countRaw(current: number, previous: number): KpiRawValue {
  return { current, previous, sampleSize: Math.max(current, previous, 1) };
}

function daysRaw(current: number, previous: number, sampleSize: number): KpiRawValue {
  return { current, previous, sampleSize, unit: "days" };
}

function currencyRaw(current: number, previous: number): KpiRawValue {
  return { current, previous, sampleSize: current > 0 || previous > 0 ? 1 : 0, unit: "currency" };
}

const DEFAULT_RULES = { highMin: 10, mediumMin: 3 };

function defineKpi(partial: Omit<HealthKpiDefinition, "normalizer"> & {
  invertTrend?: boolean;
  invertLevel?: boolean;
}): HealthKpiDefinition {
  return {
    ...partial,
    normalizer: {
      trend: (raw, target, ctx, invert) =>
        tanhTrendNormalizer(raw, target, ctx, partial.invertTrend ?? invert),
      level: (raw, target, ctx, invert) =>
        tanhLevelNormalizer(raw, target, ctx, partial.invertLevel ?? invert),
    },
  };
}

const KPI_PLUGINS: HealthKpiDefinition[] = [
  defineKpi({
    id: "backlog",
    sectionId: "produzione",
    title: "Backlog aperte",
    requiredModules: ["lavorazioni"],
    weight: 1,
    trendWeight: 0.3,
    levelWeight: 0.7,
    invertTrend: true,
    invertLevel: true,
    sampleRules: DEFAULT_RULES,
    targetKey: "backlog",
    selector: (ctx) => countRaw(ctx.snapshot.backlog, ctx.snapshot.backlog),
  }),
  defineKpi({
    id: "backlog-age",
    sectionId: "produzione",
    title: "Età media backlog",
    requiredModules: ["lavorazioni"],
    weight: 1.2,
    trendWeight: 0.3,
    levelWeight: 0.7,
    invertTrend: true,
    invertLevel: true,
    sampleRules: { highMin: 5, mediumMin: 2 },
    targetKey: "backlog_avg_age_days",
    selector: (ctx) =>
      daysRaw(ctx.snapshot.backlogAvgAgeDays, ctx.snapshot.backlogAvgAgeDays, ctx.snapshot.backlog),
  }),
  defineKpi({
    id: "completate",
    sectionId: "produzione",
    title: "Completate nel periodo",
    requiredModules: ["lavorazioni"],
    weight: 1.3,
    trendWeight: 0.5,
    levelWeight: 0.5,
    sampleRules: DEFAULT_RULES,
    targetKey: "completate_periodo",
    selector: (ctx) => countRaw(ctx.snapshot.closed, ctx.snapshot.closedPrev),
  }),
  defineKpi({
    id: "close-time",
    sectionId: "produzione",
    title: "Tempo medio chiusura",
    requiredModules: ["lavorazioni"],
    weight: 1.4,
    trendWeight: 0.4,
    levelWeight: 0.6,
    invertTrend: true,
    invertLevel: true,
    sampleRules: { highMin: 5, mediumMin: 2 },
    dependencies: ["backlog"],
    targetKey: "close_time_days",
    selector: (ctx) =>
      daysRaw(ctx.snapshot.avgCloseDays, ctx.snapshot.avgCloseDaysPrev, ctx.snapshot.closed),
  }),
  defineKpi({
    id: "urgent-turnaround",
    sectionId: "produzione",
    title: "Tempo lavori urgenti",
    requiredModules: ["lavorazioni"],
    weight: 1.2,
    trendWeight: 0.4,
    levelWeight: 0.6,
    invertTrend: true,
    invertLevel: true,
    sampleRules: { highMin: 3, mediumMin: 1 },
    targetKey: "urgent_turnaround_days",
    selector: (ctx) =>
      daysRaw(
        ctx.snapshot.urgentFulfillmentDays,
        ctx.snapshot.urgentFulfillmentDaysPrev ?? ctx.snapshot.urgentFulfillmentDays,
        ctx.snapshot.urgentSampleSize,
      ),
  }),
  defineKpi({
    id: "sla-late-pct",
    sectionId: "produzione",
    title: "SLA ritardo %",
    requiredModules: ["lavorazioni"],
    weight: 1.2,
    trendWeight: 0.3,
    levelWeight: 0.7,
    invertTrend: true,
    invertLevel: true,
    sampleRules: DEFAULT_RULES,
    targetKey: "sla_late_pct",
    selector: (ctx) =>
      pctRaw(
        Math.round((ctx.snapshot.slaLatePct / 100) * ctx.snapshot.openCount),
        ctx.snapshot.openCount,
        0,
        ctx.snapshot.openCount,
      ),
  }),
  defineKpi({
    id: "stock-critical",
    sectionId: "magazzino",
    title: "Sotto scorta critico",
    requiredModules: ["magazzino"],
    weight: 1.4,
    trendWeight: 0.2,
    levelWeight: 0.8,
    invertTrend: true,
    invertLevel: true,
    sampleRules: { highMin: 3, mediumMin: 1 },
    targetKey: "stock_critical",
    selector: (ctx) => countRaw(ctx.snapshot.stockCritical, ctx.snapshot.stockCritical),
  }),
  defineKpi({
    id: "mag-movements",
    sectionId: "magazzino",
    title: "Movimenti magazzino",
    requiredModules: ["magazzino"],
    weight: 0.7,
    trendWeight: 0.6,
    levelWeight: 0.4,
    sampleRules: DEFAULT_RULES,
    targetKey: "mag_movements",
    selector: (ctx) => countRaw(ctx.snapshot.magMovements, ctx.snapshot.magMovementsPrev),
  }),
  defineKpi({
    id: "mag-entrate",
    sectionId: "magazzino",
    title: "Entrate magazzino",
    requiredModules: ["magazzino"],
    weight: 0.9,
    trendWeight: 0.6,
    levelWeight: 0.4,
    sampleRules: DEFAULT_RULES,
    targetKey: "mag_movements",
    selector: (ctx) => countRaw(ctx.snapshot.magEntrate, ctx.snapshot.magEntratePrev),
  }),
  defineKpi({
    id: "mag-consumi",
    sectionId: "magazzino",
    title: "Consumi magazzino",
    requiredModules: ["magazzino"],
    weight: 0.9,
    trendWeight: 0.5,
    levelWeight: 0.5,
    sampleRules: DEFAULT_RULES,
    targetKey: "mag_movements",
    selector: (ctx) => countRaw(ctx.snapshot.magConsumi, ctx.snapshot.magConsumiPrev),
  }),
  defineKpi({
    id: "hours-worked",
    sectionId: "personale",
    title: "Ore lavorate",
    requiredModules: ["dipendenti"],
    weight: 1,
    trendWeight: 0.5,
    levelWeight: 0.5,
    sampleRules: { highMin: 20, mediumMin: 5 },
    targetKey: "hours_worked",
    selector: (ctx) => countRaw(ctx.snapshot.hoursWorked, ctx.snapshot.hoursWorkedPrev),
  }),
  defineKpi({
    id: "overtime-pct",
    sectionId: "personale",
    title: "Straordinari %",
    requiredModules: ["dipendenti"],
    weight: 0.8,
    trendWeight: 0.4,
    levelWeight: 0.6,
    invertTrend: true,
    invertLevel: true,
    sampleRules: { highMin: 10, mediumMin: 3 },
    targetKey: "overtime_pct",
    selector: (ctx) =>
      pctRaw(ctx.snapshot.overtimePct, 100, ctx.snapshot.overtimePctPrev, 100),
  }),
  defineKpi({
    id: "absence-procapite",
    sectionId: "personale",
    title: "Assenze pro-capite",
    requiredModules: ["dipendenti"],
    weight: 1,
    trendWeight: 0.4,
    levelWeight: 0.6,
    invertTrend: true,
    invertLevel: true,
    sampleRules: { highMin: 5, mediumMin: 2 },
    targetKey: "absence_pct",
    selector: (ctx: KpiContext) => {
      const pct =
        ctx.snapshot.hoursWorked > 0
          ? (ctx.snapshot.absenceHours / ctx.snapshot.hoursWorked) * 100
          : 0;
      const prevPct =
        ctx.snapshot.hoursWorkedPrev > 0
          ? (ctx.snapshot.absenceHoursPrev / ctx.snapshot.hoursWorkedPrev) * 100
          : null;
      return {
        current: Math.round(pct * 10) / 10,
        previous: prevPct != null ? Math.round(prevPct * 10) / 10 : null,
        sampleSize: ctx.snapshot.dipendentiAttivi,
        unit: "percent",
      };
    },
  }),
  defineKpi({
    id: "preventivi-emessi",
    sectionId: "economico",
    title: "Preventivi emessi",
    requiredModules: ["preventivi"],
    weight: 0.8,
    trendWeight: 0.5,
    levelWeight: 0.5,
    sampleRules: DEFAULT_RULES,
    targetKey: "preventivi_emessi",
    selector: (ctx) => countRaw(ctx.snapshot.preventiviEmessi, ctx.snapshot.preventiviEmessiPrev),
  }),
  defineKpi({
    id: "fatturato",
    sectionId: "economico",
    title: "Fatturato",
    requiredModules: ["fatturazione"],
    weight: 1.2,
    trendWeight: 0.5,
    levelWeight: 0.5,
    dependencies: ["completate"],
    sampleRules: DEFAULT_RULES,
    targetKey: "fatturato",
    selector: (ctx) => currencyRaw(ctx.snapshot.fatturato, ctx.snapshot.fatturatoPrev),
  }),
  defineKpi({
    id: "incassato",
    sectionId: "economico",
    title: "Incassato",
    requiredModules: ["fatturazione"],
    weight: 1.2,
    trendWeight: 0.5,
    levelWeight: 0.5,
    dependencies: ["completate"],
    sampleRules: DEFAULT_RULES,
    targetKey: "incassato",
    selector: (ctx) => currencyRaw(ctx.snapshot.incassato, ctx.snapshot.incassatoPrev),
  }),
];

export function registerDefaultHealthKpis(): void {
  for (const kpi of KPI_PLUGINS) registerHealthKpi(kpi);
}
