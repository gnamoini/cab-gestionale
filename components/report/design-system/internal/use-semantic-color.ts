"use client";

import {
  semanticColorClass,
  semanticChartColor,
  type ChartSeriesTone,
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

export function useStatusColor(tone: StatusTone): string {
  return useSemanticColor("status", tone);
}
