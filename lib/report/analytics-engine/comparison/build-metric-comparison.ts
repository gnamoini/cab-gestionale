import {
  compareBaselineValue,
  deltaPct,
  ymdFromDate,
  type DateRange,
  type ReportCompareMode,
} from "@/lib/report/date-ranges";
import { compareForApplicability } from "@/lib/report/metrics/build-metric-compare-state";
import { buildMetricCompareState } from "@/lib/report/metrics/build-metric-compare-state";
import type { ReportMetricRegistryEntry } from "@/lib/report/metrics/report-metric-types";
import type { ReportMetricCompareState } from "@/lib/report/metrics/report-metric-types";
import type { ReportMetricEnvelopeTrust } from "@/lib/report/metrics/report-metric-envelope";
import type { AnalyticsScalarResult } from "@/lib/report/analytics-engine/calculator-context";
import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";

export type MetricComparisonResult = {
  current: number;
  baseline: number | null;
  deltaAbs: number | null;
  deltaPct: number | null;
  mode: ReportCompareMode;
  availability: "available" | "unavailable";
  trust: ReportMetricEnvelopeTrust;
  compareState: ReportMetricCompareState | null;
};

export function buildAnalyticsMetricComparison(input: {
  metricId: string;
  registry: ReportMetricRegistryEntry;
  current: AnalyticsScalarResult;
  currentValue: number;
  baselineValue: number | null;
  range: DateRange;
  compareRange: DateRange | null;
  compareMode: ReportCompareMode;
}): MetricComparisonResult {
  const manifest = getEngineManifestEntry(input.metricId);
  const supportsCompare = manifest?.supportsCompare ?? false;

  if (!supportsCompare || !input.compareRange || input.compareMode === "none") {
    return {
      current: input.currentValue,
      baseline: null,
      deltaAbs: null,
      deltaPct: null,
      mode: input.compareMode,
      availability: "unavailable",
      trust: input.current.trust,
      compareState: null,
    };
  }

  const prevRaw = input.baselineValue;
  const built = buildMetricCompareState(
    input.currentValue,
    prevRaw,
    input.range,
    input.compareRange,
    input.compareMode,
  );
  const compareState = compareForApplicability(
    input.registry.applicability,
    input.compareMode,
    built,
  );

  if (!compareState || compareState.status === "unavailable") {
    return {
      current: input.currentValue,
      baseline: prevRaw,
      deltaAbs: null,
      deltaPct: null,
      mode: input.compareMode,
      availability: "unavailable",
      trust: input.current.trust,
      compareState,
    };
  }

  return {
    current: input.currentValue,
    baseline: compareState.previousValue,
    deltaAbs: compareState.deltaAbs,
    deltaPct: compareState.deltaPercent,
    mode: input.compareMode,
    availability: "available",
    trust: input.current.trust,
    compareState,
  };
}

export function scaleBaselineForCompare(
  prevRaw: number | null,
  range: DateRange,
  compareRange: DateRange,
  compareMode: ReportCompareMode,
): number | null {
  if (prevRaw == null) return null;
  return compareBaselineValue(prevRaw, compareRange, range, compareMode);
}

export { deltaPct, ymdFromDate };
