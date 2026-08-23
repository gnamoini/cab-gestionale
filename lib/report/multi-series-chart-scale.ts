import type { KpiChartDisplayMode } from "@/lib/report/metrics/report-metric-types";

export type AxisExtent = { min: number; max: number };

type ScaleSeries = {
  axis?: "left" | "right";
  points: readonly { displayValue: number | null }[];
};

export function seriesAxisSide(
  series: Pick<ScaleSeries, "axis">,
  displayMode: KpiChartDisplayMode,
): "left" | "right" {
  if (displayMode === "dual-axis" && series.axis === "right") return "right";
  return "left";
}

function normalizeExtent(min: number, max: number): AxisExtent {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) {
    const pad = min === 0 ? 1 : Math.max(Math.abs(min) * 0.08, 1);
    return { min: min - pad, max: max + pad };
  }
  const span = max - min;
  const pad = span * 0.05;
  return { min: min - pad, max: max + pad };
}

/** Min/max per asse — include valori negativi (es. accumulo cumulativo). */
export function resolveSeriesAxisExtents(
  series: readonly ScaleSeries[],
  displayMode: KpiChartDisplayMode,
  side: "left" | "right",
): AxisExtent {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    if (seriesAxisSide(s, displayMode) !== side) continue;
    for (const p of s.points) {
      if (p.displayValue == null) continue;
      min = Math.min(min, p.displayValue);
      max = Math.max(max, p.displayValue);
    }
  }
  return normalizeExtent(min, max);
}

export function valueToChartY(v: number, extent: AxisExtent, innerTop: number, innerHeight: number): number {
  const span = extent.max - extent.min;
  if (span <= 0) return innerTop + innerHeight / 2;
  const t = (v - extent.min) / span;
  return innerTop + innerHeight - t * innerHeight;
}
