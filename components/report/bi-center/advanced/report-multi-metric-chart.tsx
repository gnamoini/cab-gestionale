"use client";

import type { ReportMetricSeries } from "@/lib/report/analytics-engine/types";
import type { MultiMetricDisplayMode } from "@/lib/report/bi-center/resolve-multi-metric-display-mode";
import { ReportTrendChart } from "@/components/report/bi-center/report-trend-chart";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

export function ReportMultiMetricChart({
  mode,
  seriesA,
  seriesB,
  metricA,
  metricB,
}: {
  mode: MultiMetricDisplayMode;
  seriesA: ReportMetricSeries | undefined;
  seriesB: ReportMetricSeries | undefined;
  metricA: string;
  metricB: string;
}) {
  if (mode === "blocked") {
    return (
      <p className="text-sm text-[color:var(--cab-text-muted)]">
        Confronto non disponibile per questa coppia nel periodo selezionato.
      </p>
    );
  }

  const labelA = getRegistryEntry(metricA)?.label ?? metricA;
  const labelB = getRegistryEntry(metricB)?.label ?? metricB;

  if (mode === "direct_overlay" || mode === "indexed") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportTrendChart series={seriesA} title={labelA} />
        <ReportTrendChart series={seriesB} title={labelB} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReportTrendChart series={seriesA} title={labelA} />
      <ReportTrendChart series={seriesB} title={labelB} />
      <p className="text-xs text-[color:var(--cab-text-muted)]">Scale separate — unità diverse</p>
    </div>
  );
}
