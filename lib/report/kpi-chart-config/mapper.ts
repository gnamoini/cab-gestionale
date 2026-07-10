import type {
  KpiChartConfigBody,
  ReportSavedKpiChartRow,
  SavedKpiChart,
} from "@/lib/report/kpi-chart-config/contracts";
import { parseKpiChartConfigBody } from "@/lib/report/kpi-chart-config/validation";

export function rowToSavedKpiChart(row: ReportSavedKpiChartRow): SavedKpiChart | null {
  const config = parseKpiChartConfigBody(row.config);
  if (!config) return null;
  return {
    id: row.id,
    name: row.name,
    ...config,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function savedKpiChartToConfigBody(chart: Pick<
  SavedKpiChart,
  "metricIds" | "preset" | "customFrom" | "customTo" | "displayMode" | "normalization"
>): KpiChartConfigBody {
  return {
    metricIds: [...chart.metricIds],
    preset: chart.preset,
    customFrom: chart.customFrom,
    customTo: chart.customTo,
    displayMode: chart.displayMode,
    normalization: { ...chart.normalization },
  };
}

export function mapRowsToSavedCharts(rows: ReportSavedKpiChartRow[]): SavedKpiChart[] {
  const out: SavedKpiChart[] = [];
  for (const row of rows) {
    const chart = rowToSavedKpiChart(row);
    if (chart) out.push(chart);
  }
  return out;
}
