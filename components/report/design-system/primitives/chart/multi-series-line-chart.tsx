"use client";

import { memo } from "react";
import { ReportBklitMultiSeries } from "@/components/report/bklit/report-bklit-charts";
import type { KpiChartDisplayMode } from "@/lib/report/metrics/report-metric-types";
import type { ReportMetricUnit } from "@/lib/report/metrics/report-metric-types";
import { unitToReportFormatter, type ReportValueFormatter } from "@/lib/report/metrics/report-value-formatter";
import { reportBklitSeriesColor } from "@/lib/report/ui/bklit-adapters";

export const KPI_CHART_SERIES_COLORS = [
  reportBklitSeriesColor(0),
  reportBklitSeriesColor(1),
  reportBklitSeriesColor(2),
  reportBklitSeriesColor(3),
  reportBklitSeriesColor(4),
] as const;

export type MultiSeriesLineChartPoint = {
  date: string;
  displayValue: number | null;
  realValue: number | null;
};

export type MultiSeriesLineChartSeries = {
  id: string;
  label: string;
  color: string;
  unit: ReportMetricUnit;
  points: MultiSeriesLineChartPoint[];
  axis?: "left" | "right";
};

function ReportMultiSeriesLineChartInner({
  series,
  displayMode,
}: {
  series: MultiSeriesLineChartSeries[];
  displayMode: KpiChartDisplayMode;
}) {
  return <ReportBklitMultiSeries series={series} displayMode={displayMode} />;
}

export const ReportMultiSeriesLineChart = memo(ReportMultiSeriesLineChartInner);

export function seriesFormatter(unit: ReportMetricUnit): ReportValueFormatter {
  return unitToReportFormatter(unit);
}
