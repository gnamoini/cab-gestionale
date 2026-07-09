"use client";

import { renderReportMetric } from "@/lib/report/report-renderer-registry";
import type { ReportMetric, ReportMetricRegistryEntry } from "@/lib/report/metrics/report-metric-types";

export function ReportMetricRenderer({
  metric,
  definition,
  hero,
  compact,
}: {
  metric: ReportMetric;
  definition: ReportMetricRegistryEntry;
  hero?: boolean;
  compact?: boolean;
}) {
  return renderReportMetric(metric, definition, { hero, compact });
}
