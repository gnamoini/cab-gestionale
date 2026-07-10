import type { NormalizedKpiSeries } from "@/lib/report/kpi-series/normalize";
import type { KpiChartDisplayMode } from "@/lib/report/metrics/report-metric-types";
import {
  KPI_CHART_SERIES_COLORS,
  type MultiSeriesLineChartSeries,
} from "@/components/report/design-system/primitives/chart/multi-series-line-chart";

export function buildMultiSeriesChartProps(
  series: NormalizedKpiSeries[],
  displayMode: KpiChartDisplayMode,
): MultiSeriesLineChartSeries[] {
  const units = [...new Set(series.map((s) => s.unit))];
  const unitAxis = new Map<string, "left" | "right">();
  if (displayMode === "dual-axis" && units.length === 2) {
    unitAxis.set(units[0]!, "left");
    unitAxis.set(units[1]!, "right");
  }

  return series
    .filter((s) => s.status === "ready")
    .map((s, i) => ({
      id: s.metricId,
      label: s.label,
      color: KPI_CHART_SERIES_COLORS[i % KPI_CHART_SERIES_COLORS.length]!,
      unit: s.unit,
      axis: unitAxis.get(s.unit),
      points: s.displayValues.map((p, idx) => ({
        date: p.date,
        displayValue: p.value,
        realValue: s.realValues[idx]?.value ?? null,
      })),
    }));
}

export function kpiChartStatusMessage(
  status: "idle" | "invalid" | "empty" | "ready" | "partial",
): string | null {
  if (status === "idle") return "Seleziona almeno 2 KPI e applica la configurazione.";
  if (status === "invalid") return "Correggi la configurazione per visualizzare il grafico.";
  if (status === "empty") return "Nessun dato sufficiente nel periodo selezionato.";
  return null;
}
