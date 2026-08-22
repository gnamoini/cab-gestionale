import type { ReportMetricTrendSemantics } from "@/lib/report/metrics/report-metric-types";
import { shouldInvertCompareTone } from "@/lib/report/metrics/build-metric-compare-state";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";

export type MetricTrendTone = "positive" | "negative" | "warning" | "neutral";

/** Semantic KPI tone — not raw +/- sign. */
export function resolveMetricTrendTone(metricId: string, deltaPercent: number | null | undefined): MetricTrendTone {
  if (deltaPercent == null || !Number.isFinite(deltaPercent)) return "neutral";
  if (Math.abs(deltaPercent) < 0.5) return "neutral";

  const semantics: ReportMetricTrendSemantics =
    getRegistryEntry(metricId)?.trendSemantics ?? "neutral";
  const invert = shouldInvertCompareTone(semantics);
  const favorable = invert ? deltaPercent < 0 : deltaPercent > 0;
  const unfavorable = invert ? deltaPercent > 0 : deltaPercent < 0;

  if (favorable) return "positive";
  if (unfavorable) return "negative";
  return "neutral";
}

export function metricTrendToneClass(tone: MetricTrendTone): string {
  switch (tone) {
    case "positive":
      return "text-[color:var(--cab-success)]";
    case "negative":
      return "text-[color:var(--cab-danger)]";
    case "warning":
      return "text-[color:var(--cab-warning)]";
    default:
      return "text-[color:var(--cab-text-muted)]";
  }
}
