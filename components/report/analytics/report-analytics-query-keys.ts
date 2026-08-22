import type { ReportAnalyticsGranularity } from "@/lib/report/analytics-engine/types";
import type { ReportDimensionId } from "@/lib/report/metrics/report-metric-types";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";

export type ReportAnalyticsQueryKeyInput = {
  period: ReportRequestedPeriod;
  metricIds: readonly string[];
  granularity?: ReportAnalyticsGranularity;
  includeSeries?: boolean;
  dimensions?: readonly ReportDimensionId[];
};

export function normalizeMetricIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort();
}

export function reportAnalyticsQueryKey(input: ReportAnalyticsQueryKeyInput): readonly unknown[] {
  return [
    "report-analytics",
    input.period.preset,
    input.period.start,
    input.period.end,
    input.period.compareMode,
    normalizeMetricIds(input.metricIds).join(","),
    input.granularity ?? "",
    input.includeSeries ? "series" : "",
    (input.dimensions ?? []).slice().sort().join(","),
  ] as const;
}
