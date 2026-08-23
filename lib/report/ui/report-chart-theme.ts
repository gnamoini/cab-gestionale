/**
 * SSOT chart visual tokens — consumed by all Report chart wrappers.
 */
import { semanticChartColor } from "@/components/report/design-system/tokens/semantic-colors-policy";

export const REPORT_CHART_THEME = {
  strokeWidth: 2,
  pointRadius: 3,
  gridStroke: "color-mix(in srgb, var(--cab-border) 65%, transparent)",
  axisColor: "var(--cab-text-muted)",
  fontSize: 11,
  padding: { top: 12, right: 12, bottom: 28, left: 44 },
  animationMs: 200,
} as const;

export type ChartSeriesTone = "primary" | "secondary" | "muted" | "accent";

const SERIES_TONES: ChartSeriesTone[] = ["primary", "secondary", "accent", "muted"];

export function reportChartSeriesColor(tone: ChartSeriesTone, index = 0): string {
  const t = SERIES_TONES[index % SERIES_TONES.length] ?? tone;
  return semanticChartColor("chartSeries", t);
}

export function reportChartSeriesColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => reportChartSeriesColor("primary", i));
}

export const REPORT_CHART_FILL_SURFACE = "var(--cab-card)";
