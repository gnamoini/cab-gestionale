import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";

export type InsightMetricMapEntry = { value: number; trust: string };

export function envelopesToInsightMetricMap(
  envelopes: readonly ReportMetricEnvelope[],
): Map<string, InsightMetricMapEntry> {
  const map = new Map<string, InsightMetricMapEntry>();
  for (const env of envelopes) {
    map.set(env.metricId, { value: env.metric.value, trust: env.trust });
  }
  return map;
}
