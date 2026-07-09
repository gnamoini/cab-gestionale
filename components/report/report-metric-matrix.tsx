"use client";

import type { ReportMetric, ReportMetricRegistryEntry } from "@/lib/report/metrics/report-metric-types";

export function ReportMetricMatrix({
  metric,
  definition,
}: {
  metric: ReportMetric;
  definition: ReportMetricRegistryEntry;
}) {
  const year = metric.payload?.kind === "matrix" ? metric.payload.data.year : metric.value;
  return (
    <details className="min-w-0">
      <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
        {definition.label} ({year})
      </summary>
      <p className="mt-2 text-sm text-[color:var(--cab-text-muted)]">
        Matrice annuale — apri la sezione Lavorazioni per il dettaglio mensile.
      </p>
    </details>
  );
}
