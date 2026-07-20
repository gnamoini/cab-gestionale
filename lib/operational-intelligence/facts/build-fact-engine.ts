import type { AnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import type { ReportCrossDto } from "@/lib/report/cross-analysis/types";
import type { ReportInsightsDto } from "@/lib/report/insights/types";
import type { OperationalPeriod } from "@/lib/operational-intelligence/period/types";

export type FactEngineOutput = {
  period: OperationalPeriod;
  metrics: Record<string, number>;
  deltas: Record<string, { current: number; previous: number; deltaPct: number }>;
};

function metricValue(metrics: { id: string; value: number | string }[], id: string): number {
  const row = metrics.find((m) => m.id === id);
  if (!row) return 0;
  const n = typeof row.value === "number" ? row.value : Number(row.value);
  return Number.isFinite(n) ? n : 0;
}

/** KPI certi dal bundle — no AI. */
export function buildFactEngine(input: {
  period: OperationalPeriod;
  bundle: AnalyticsDatasetBundle;
  cross: ReportCrossDto;
  insights: ReportInsightsDto;
}): FactEngineOutput {
  const lav = input.bundle.datasets.lavorazioni.metrics;
  const mag = input.bundle.datasets.magazzino.metrics;
  const eco = input.bundle.datasets.economico.metrics;
  const ore = input.bundle.datasets.ore.metrics;

  const metrics: Record<string, number> = {
    lav_opened: metricValue(lav, "lav-periodo"),
    lav_closed: metricValue(lav, "lav-chiusi"),
    lav_open: metricValue(lav, "lav-aperti"),
    lav_avg_close_days: metricValue(lav, "lav-tempo"),
    lav_late_sla: metricValue(lav, "lav_late_sla"),
    mag_low_stock: metricValue(mag, "scorta"),
    mag_parts_used: metricValue(mag, "ric-usati"),
    ore_total: metricValue(ore, "ore_total"),
    eco_revenue: metricValue(eco, "eco_fatturato"),
    insights_fired: input.insights.insights.length,
    insights_critical: input.insights.insights.filter((i) => i.severity === "critical").length,
  };

  for (const m of input.cross.metrics) {
    metrics[`cross_${m.metricId}`] = m.value;
  }

  return { period: input.period, metrics, deltas: {} };
}
