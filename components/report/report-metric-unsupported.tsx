"use client";

import type { ReportMetricKind } from "@/lib/report/metrics/report-metric-types";

export function ReportMetricUnsupported({
  metricId,
  kind,
}: {
  metricId: string;
  kind: ReportMetricKind;
}) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[report-metric] unsupported renderer kind "${kind}" for ${metricId}`);
  }
  return (
    <div
      className="rounded-lg border border-dashed border-[color:var(--cab-border)] p-3 text-xs text-[color:var(--cab-text-muted)]"
      data-metric-id={metricId}
    >
      Visualizzazione non disponibile per questa metrica ({kind}).
    </div>
  );
}
