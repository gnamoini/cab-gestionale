"use client";

import { ReportMetricRenderer } from "@/components/report/report-metric-renderer";
import { useReportDensity } from "@/components/report/design-system/internal/use-report-density";
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
  const { metricGridCols } = useReportDensity();
  if (metrics.length === 0) return null;
  return (
    <div className={`grid min-w-0 gap-3 ${metricGridCols}`}>
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
