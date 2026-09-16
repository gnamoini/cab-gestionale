"use client";

import type { ReportMetricSeries, ReportAnalyticsGranularity } from "@/lib/report/analytics-engine/types";
import type { ReportValueFormatter } from "@/lib/report/metrics/report-value-formatter";
import { formatReportMetricValue, unitToReportFormatter } from "@/lib/report/metrics/report-value-formatter";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { ReportBklitTrend } from "@/components/report/bklit/report-bklit-charts";

type TrendPoint = { label: string; value: number; date: string };

function formatTrendBucketLabel(ymd: string, granularity: ReportAnalyticsGranularity): string {
  const d = new Date(`${ymd.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  if (granularity === "month") {
    return d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function sparseTrendHint(granularity: ReportAnalyticsGranularity, pointCount: number): string | null {
  if (pointCount >= 2) return null;
  const grain =
    granularity === "day" ? "giornaliera" : granularity === "week" ? "settimanale" : "mensile";
  return `Un solo punto ${grain} nel periodo — allarga il periodo o cambia granularità.`;
}

export function ReportTrendChart({
  series,
  metricId,
  granularity = "week",
  title,
  emptyLabel = "Nessun dato nel periodo",
  embedded = false,
  showTitle = true,
}: {
  series: ReportMetricSeries | undefined;
  metricId?: string;
  granularity?: ReportAnalyticsGranularity;
  title?: string;
  emptyLabel?: string;
  embedded?: boolean;
  showTitle?: boolean;
}) {
  const registry = metricId ? getRegistryEntry(metricId) : undefined;
  const formatter: ReportValueFormatter =
    registry?.formatter ?? (registry?.unit ? unitToReportFormatter(registry.unit) : "integer");
  const useBars = registry?.unit === "count";
  const formatValue = (value: number) => formatReportMetricValue(value, formatter);

  const shellClass = embedded
    ? "flex min-h-[14rem] items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_40%,transparent)] text-sm text-[color:var(--cab-text-muted)]"
    : "flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-[color:var(--cab-border)] text-sm text-[color:var(--cab-text-muted)]";

  if (!series?.points.length) {
    return <div className={shellClass}>{emptyLabel}</div>;
  }

  const points: TrendPoint[] = series.points
    .filter((p) => p.value != null)
    .map((p) => ({
      label: formatTrendBucketLabel(p.periodStart, granularity),
      value: p.value as number,
      date: `${p.periodStart.slice(0, 10)}T12:00:00.000Z`,
    }));

  if (points.length === 0) {
    return <div className={shellClass}>Dati non disponibili</div>;
  }

  const hint = sparseTrendHint(granularity, points.length);

  return (
    <div className="space-y-2">
      {showTitle && title ? (
        <p className="text-sm font-semibold text-[color:var(--cab-text)]">{title}</p>
      ) : null}
      {hint ? (
        <p className="rounded-md border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_50%,var(--cab-card))] px-3 py-2 text-xs leading-relaxed text-[color:var(--cab-text-muted)]">
          {hint}
        </p>
      ) : null}
      <div
        className={
          embedded
            ? "rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_25%,var(--cab-card))] px-1 py-2 sm:px-2"
            : "rounded-lg border border-[color:var(--cab-border)] p-2"
        }
      >
        <ReportBklitTrend points={points} useBars={useBars} formatValue={formatValue} />
      </div>
    </div>
  );
}
