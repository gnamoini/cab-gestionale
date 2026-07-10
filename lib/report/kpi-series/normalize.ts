import type { KpiChartDisplayMode } from "@/lib/report/metrics/report-metric-types";
import type { KpiSeries, KpiSeriesPoint } from "@/lib/report/kpi-series/contracts/kpi-series-contract";

export type NormalizationConfig = {
  mode: "indexed" | "absolute";
  baseline: "first-visible-point" | "first-period";
  missing: "ignore" | "zero";
};

export const DEFAULT_NORMALIZATION: NormalizationConfig = {
  mode: "indexed",
  baseline: "first-visible-point",
  missing: "ignore",
};

export type NormalizedKpiSeries = KpiSeries & {
  displayValues: KpiSeriesPoint[];
  realValues: KpiSeriesPoint[];
};

export function canUseAbsoluteMode(metricIds: readonly string[], units: readonly string[]): boolean {
  return metricIds.length <= 2 && new Set(units).size <= 2;
}

export function resolveDisplayMode(
  requested: "indexed" | "absolute",
  metricIds: readonly string[],
  units: readonly string[],
): KpiChartDisplayMode {
  if (requested === "indexed") return "indexed";
  if (!canUseAbsoluteMode(metricIds, units)) return "indexed";
  return units.length === 2 && new Set(units).size === 2 ? "dual-axis" : "absolute";
}

function firstBaselineValue(points: KpiSeriesPoint[], missing: NormalizationConfig["missing"]): number | null {
  for (const p of points) {
    if (p.value == null) {
      if (missing === "zero") return 0;
      continue;
    }
    if (p.value === 0 && missing === "ignore") continue;
    return p.value;
  }
  return null;
}

export function normalizeSeries(
  series: KpiSeries,
  config: NormalizationConfig,
): NormalizedKpiSeries {
  const realValues = series.points;
  if (config.mode === "absolute") {
    return { ...series, displayValues: realValues, realValues };
  }

  const baseline = firstBaselineValue(realValues, config.missing);
  if (baseline == null || baseline === 0) {
    return {
      ...series,
      realValues,
      displayValues: realValues.map((p) => ({ ...p, value: p.value == null ? null : 100 })),
    };
  }

  const displayValues = realValues.map((p) => {
    if (p.value == null) return { ...p, value: null };
    return { ...p, value: Math.round((p.value / baseline) * 1000) / 10 };
  });

  return { ...series, realValues, displayValues };
}
