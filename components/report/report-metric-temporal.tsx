"use client";

import { MagazzinoCapitalLineChart } from "@/components/report/report-charts";
import { reportChartShellClass } from "@/components/report/report-ui-tokens";
import type { ReportMetric, ReportMetricRegistryEntry } from "@/lib/report/metrics/report-metric-types";

export function ReportMetricTemporal({
  metric,
  definition,
}: {
  metric: ReportMetric;
  definition: ReportMetricRegistryEntry;
}) {
  const payload = metric.payload?.kind === "temporal" ? metric.payload.data : null;
  const points = payload?.points ?? [];
  if (points.length === 0) {
    return (
      <p className="text-sm text-[color:var(--cab-text-muted)]">Serie temporale non disponibile.</p>
    );
  }
  return (
    <div className={reportChartShellClass}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        {definition.label}
      </p>
      <MagazzinoCapitalLineChart
        rows={points.map((p) => ({ label: p.label, capitaleFinale: p.value }))}
      />
    </div>
  );
}
