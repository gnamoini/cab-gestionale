import type { ReportAnalyticsResult } from "@/lib/report/analytics-engine/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";

export type ReportAiAnalyticsContextInput = {
  metrics: ReportMetricEnvelope[];
  series: ReportAnalyticsResult["series"];
  trustSummary: ReportAnalyticsResult["trustSummary"];
  period: ReportAnalyticsResult["period"];
  compare: ReportAnalyticsResult["compare"];
};

export function buildReportAnalyticsForAiContext(
  result: ReportAnalyticsResult,
): ReportAiAnalyticsContextInput {
  return {
    metrics: result.metrics,
    series: result.series,
    trustSummary: result.trustSummary,
    period: result.period,
    compare: result.compare,
  };
}
