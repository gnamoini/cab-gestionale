import type { DateRange } from "@/lib/report/date-ranges";
import type { ReportCompareMode, ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import type { ReportDimensionId } from "@/lib/report/metrics/report-metric-types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { ReportMetricEnvelopeTrust } from "@/lib/report/metrics/report-metric-envelope";

export type ReportAnalyticsGranularity = "day" | "week" | "month";

export type ReportAnalyticsQuery = {
  period: ReportRequestedPeriod;
  metricIds: readonly string[];
  compareMode?: ReportCompareMode;
  granularity?: ReportAnalyticsGranularity;
  dimensions?: readonly ReportDimensionId[];
  includeSeries?: boolean;
};

export type ReportAnalyticsCompareMeta = {
  mode: ReportCompareMode;
  from: string | null;
  to: string | null;
};

export type ReportMetricSeriesPoint = {
  periodStart: string;
  periodEnd: string;
  value: number | null;
  trust: ReportMetricEnvelopeTrust;
};

export type ReportMetricSeries = {
  metricId: string;
  granularity: ReportAnalyticsGranularity;
  points: ReportMetricSeriesPoint[];
};

export type ReportAnalyticsTrustSummary = {
  exact: number;
  estimated: number;
  partial: number;
  notAvailable: number;
  lowestTrust: ReportMetricEnvelopeTrust;
};

export type ReportDimensionBreakdownRow = {
  key: string;
  label: string;
  value: number;
};

export type ReportDimensionBreakdown = {
  dimension: ReportDimensionId;
  metricId: string;
  rows: ReportDimensionBreakdownRow[];
};

export type ReportAnalyticsResult = {
  period: { from: string; to: string };
  compare: ReportAnalyticsCompareMeta;
  metrics: ReportMetricEnvelope[];
  series: ReportMetricSeries[];
  dimensions: ReportDimensionBreakdown[];
  trustSummary: ReportAnalyticsTrustSummary;
};

export type ResolvedAnalyticsPeriod = {
  period: ReportRequestedPeriod;
  range: DateRange;
  compareRange: DateRange | null;
  compareMode: ReportCompareMode;
  rangeKey: string;
};
