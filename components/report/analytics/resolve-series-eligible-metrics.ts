import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { ReportAnalyticsGranularity } from "@/lib/report/analytics-engine/types";

const PRIMARY_TREND_CANDIDATES = [
  "eco_fatturato",
  "eco_incassato",
  "lav-periodo",
  "lav-chiusi",
  "ric-usati",
  "presence_hours_total",
] as const;

export function isSeriesEligibleForPrimaryTrend(
  metricId: string,
  granularity: ReportAnalyticsGranularity,
): boolean {
  const manifest = getEngineManifestEntry(metricId);
  const registry = getRegistryEntry(metricId);
  if (!manifest?.supportsSeries || !registry) return false;
  if (!registry.series?.granularities?.includes(granularity)) return false;
  if (registry.applicability === "snapshot") return false;
  if (registry.status === "draft" || registry.status === "blocked") return false;
  return true;
}

export function listPrimaryTrendEligibleMetrics(
  granularity: ReportAnalyticsGranularity,
): string[] {
  return PRIMARY_TREND_CANDIDATES.filter((id) => isSeriesEligibleForPrimaryTrend(id, granularity));
}
