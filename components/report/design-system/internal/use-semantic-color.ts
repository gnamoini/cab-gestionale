"use client";

import {
  semanticColorClass,
  semanticChartColor,
  type ChartSeriesTone,
  type MetricTrendTone,
  type SemanticColorContext,
  type SemanticTone,
  type StatusTone,
} from "@/components/report/design-system/tokens/semantic-colors-policy";

export function useSemanticColor(context: SemanticColorContext, tone: SemanticTone): string {
  if (context === "chartSeries") {
    return semanticChartColor("chartSeries", tone as ChartSeriesTone);
  }
  return semanticColorClass(context, tone);
}

export function useMetricTrendColor(tone: MetricTrendTone): string {
  return useSemanticColor("metricTrend", tone);
}

export function useStatusColor(tone: StatusTone): string {
  return useSemanticColor("status", tone);
}
