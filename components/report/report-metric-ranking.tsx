"use client";

import type { ReportMetric, ReportMetricRegistryEntry } from "@/lib/report/metrics/report-metric-types";

export function ReportMetricRanking({
  metric,
  definition,
}: {
  metric: ReportMetric;
  definition: ReportMetricRegistryEntry;
}) {
  const rowCount = metric.payload?.kind === "ranking" ? metric.payload.data.rowCount : metric.value;
  return (
    <p className="text-sm text-[color:var(--cab-text-muted)]">
      {definition.label}: <span className="font-semibold text-[color:var(--cab-text)]">{rowCount}</span> righe
    </p>
  );
}
