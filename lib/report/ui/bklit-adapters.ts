import type { MultiSeriesLineChartSeries } from "@/components/report/design-system/primitives/chart/multi-series-line-chart";
import type { YearForecastLinePoint } from "@/lib/report/lavorazioni-year-matrix";
import type { KpiChartDisplayMode } from "@/lib/report/metrics/report-metric-types";

export const REPORT_BKLIT_CHART_CLASS = "h-56 w-full min-w-0 max-w-full";
export const REPORT_BKLIT_CHART_MARGIN = { top: 16, right: 16, bottom: 36, left: 44 } as const;

export function reportBklitSeriesColor(index: number): string {
  const n = (index % 5) + 1;
  return `var(--chart-${n})`;
}

/** ponytail: Bklit time-series roots parse x as Date — use ISO, not display labels. */
export function indexToChartDate(index: number): string {
  return new Date(Date.UTC(2020, 0, 1 + index)).toISOString();
}

export function ymdToChartDate(ymd: string): string {
  const trimmed = ymd.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01T12:00:00.000Z`;
  }
  return `${trimmed.slice(0, 10)}T12:00:00.000Z`;
}

export function categoricalBarRows(
  points: readonly { label: string; value: number; muted?: boolean }[],
): Record<string, unknown>[] {
  return points.map((p) => ({
    name: p.label,
    value: p.value,
    muted: Boolean(p.muted),
  }));
}

export function temporalMonthlyBarRows(
  rows: readonly { label: string; count: number; muted?: boolean }[],
): Record<string, unknown>[] {
  return rows.map((r) => ({
    name: r.label,
    value: r.count,
    muted: Boolean(r.muted),
  }));
}

export function capitalLineRows(rows: readonly { label: string; capitaleFinale: number }[]): Record<string, unknown>[] {
  return rows.map((r, i) => ({
    name: r.label,
    value: r.capitaleFinale,
    date: indexToChartDate(i),
  }));
}

export function trendPointsToLineData(
  points: readonly { label: string; value: number; date?: string }[],
): Record<string, unknown>[] {
  return points.map((p, i) => ({
    name: p.label,
    value: p.value,
    date: p.date ?? indexToChartDate(i),
  }));
}

export function mergeMultiSeriesLineData(
  series: readonly MultiSeriesLineChartSeries[],
  displayMode: KpiChartDisplayMode,
): Record<string, unknown>[] {
  const dateSet = new Set<string>();
  for (const s of series) {
    for (const p of s.points) dateSet.add(p.date);
  }
  const dates = [...dateSet].sort();
  return dates.map((date) => {
    const row: Record<string, unknown> = { date: ymdToChartDate(date) };
    for (const s of series) {
      const pt = s.points.find((p) => p.date === date);
      row[s.id] = pt?.displayValue ?? null;
    }
    return row;
  });
}

export function multiSeriesStroke(index: number, explicit?: string): string {
  if (explicit && explicit.startsWith("var(")) return explicit;
  return reportBklitSeriesColor(index);
}

/** Maps forecast model output to a single line series + optional dashed tail (same inputs as legacy SVG). */
export function yearlyForecastLineChartData(
  solid: readonly YearForecastLinePoint[],
  dashed: readonly YearForecastLinePoint[],
): Record<string, unknown>[] {
  const byX = new Map<number, Record<string, unknown>>();
  for (const p of solid) {
    byX.set(p.x, {
      name: p.label,
      x: p.x,
      date: `${p.year}-07-01T12:00:00.000Z`,
      value: p.value,
      kind: p.kind,
      forecast: null as number | null,
    });
  }
  if (dashed.length >= 2) {
    const tail = dashed[dashed.length - 1]!;
    const prev = dashed[0]!;
    const row = byX.get(tail.x) ?? {
      name: tail.label,
      x: tail.x,
      date: `${tail.year}-07-01T12:00:00.000Z`,
      value: prev.value,
      kind: "forecast",
      forecast: null as number | null,
    };
    if (!row.date) row.date = `${tail.year}-07-01T12:00:00.000Z`;
    row.forecast = tail.value;
    row.value = prev.value;
    byX.set(tail.x, row);
  }
  return [...byX.values()].sort((a, b) => (a.x as number) - (b.x as number));
}

export function funnelStagesFromRows(
  rows: readonly { label: string; count: number; value?: number }[],
): { label: string; value: number }[] {
  return rows.map((r) => ({ label: r.label, value: r.count }));
}

export function pieSlicesFromLabeledValues(
  items: readonly { label: string; value: number; color?: string }[],
): { label: string; value: number; color?: string }[] {
  return items.filter((i) => i.value > 0).map((i) => ({ label: i.label, value: i.value, color: i.color }));
}
