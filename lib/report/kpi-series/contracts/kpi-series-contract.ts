import type { KpiSeriesGranularity, ReportMetricUnit } from "@/lib/report/metrics/report-metric-types";

export type KpiSeriesPoint = {
  date: string;
  value: number | null;
};

export type KpiSeriesStatus = "ready" | "empty" | "unavailable";

export type KpiSeries = {
  metricId: string;
  label: string;
  unit: ReportMetricUnit;
  granularity: KpiSeriesGranularity;
  points: KpiSeriesPoint[];
  status: KpiSeriesStatus;
  unavailableReason?: string;
};

export type KpiSeriesBundle = {
  series: KpiSeries[];
  bucket: KpiSeriesGranularity;
  range: { start: string; end: string };
  bucketDowngraded?: boolean;
};
