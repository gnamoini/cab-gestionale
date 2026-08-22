import type { CrossMonthlyPoint } from "@/lib/report/cross-analysis/build-cross-monthly-trend";

export type CrossMetricSeriesKey = "efficiency" | "partsPerJob" | "costPerJob" | "valuePerHour";

const CROSS_METRIC_KEYS: readonly CrossMetricSeriesKey[] = [
  "efficiency",
  "partsPerJob",
  "costPerJob",
  "valuePerHour",
] as const;

/** ponytail: heuristic audit — certifies monthly bucket stability before engine supportsSeries. */
export function auditCrossMonthlySeriesCertification(
  points: readonly CrossMonthlyPoint[],
): Record<CrossMetricSeriesKey, boolean> {
  const result: Record<CrossMetricSeriesKey, boolean> = {
    efficiency: false,
    partsPerJob: false,
    costPerJob: false,
    valuePerHour: false,
  };

  if (points.length < 2) return result;

  for (const key of CROSS_METRIC_KEYS) {
    const values = points.map((p) => p[key]);
    const nonNull = values.filter((v): v is number => v != null && Number.isFinite(v));
    if (nonNull.length < 2) continue;
    const uniqueBuckets = new Set(points.map((p) => p.monthKey));
    if (uniqueBuckets.size !== points.length) continue;
    result[key] = true;
  }

  return result;
}

export function isAnyCrossSeriesCertified(
  audit: Record<CrossMetricSeriesKey, boolean>,
): boolean {
  return CROSS_METRIC_KEYS.some((k) => audit[k]);
}
