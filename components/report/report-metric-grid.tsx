"use client";

import { ReportMetricRenderer } from "@/components/report/report-metric-renderer";
import { getMetricDefinition } from "@/lib/report/metrics/get-metric-definition";
import type { ReportMetric } from "@/lib/report/metrics/report-metric-types";

export function ReportMetricGrid({
  metrics,
  hero,
  compact,
}: {
  metrics: readonly ReportMetric[];
  hero?: boolean;
  compact?: boolean;
}) {
  if (metrics.length === 0) return null;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <ReportMetricRenderer
          key={m.id}
          metric={m}
          definition={getMetricDefinition(m.id)}
          hero={hero}
          compact={compact}
        />
      ))}
    </div>
  );
}
