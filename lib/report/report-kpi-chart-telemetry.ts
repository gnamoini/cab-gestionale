import type { KpiChartDisplayMode, KpiSeriesGranularity } from "@/lib/report/metrics/report-metric-types";

export type ReportKpiChartTelemetryEvent =
  | {
      type: "report_kpi_chart_opened";
      metricIds: string[];
      timeframe: string;
      displayMode: KpiChartDisplayMode;
      bucket: KpiSeriesGranularity;
    }
  | {
      type: "report_kpi_chart_provider_failed";
      metricId: string;
      provider: string;
      reason: string;
    }
  | {
      type: "report_kpi_chart_saved";
      configId: string;
      metricCount: number;
    }
  | {
      type: "report_kpi_chart_migrated";
      importedCount: number;
      skippedCount: number;
      schemaVersion: number;
    };

type TelemetrySink = (event: ReportKpiChartTelemetryEvent) => void;

let sink: TelemetrySink | null = null;

export function setReportKpiChartTelemetrySink(next: TelemetrySink | null): void {
  sink = next;
}

function emit(event: ReportKpiChartTelemetryEvent): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[report-kpi-chart]", event);
  }
  sink?.(event);
}

export function reportKpiChartOpened(payload: {
  metricIds: string[];
  timeframe: string;
  displayMode: KpiChartDisplayMode;
  bucket: KpiSeriesGranularity;
}): void {
  emit({ type: "report_kpi_chart_opened", ...payload });
}

export function reportKpiChartProviderFailed(payload: {
  metricId: string;
  provider: string;
  reason: string;
}): void {
  emit({ type: "report_kpi_chart_provider_failed", ...payload });
}

export function reportKpiChartSaved(payload: { configId: string; metricCount: number }): void {
  emit({ type: "report_kpi_chart_saved", ...payload });
}

export function reportKpiChartMigrated(payload: {
  importedCount: number;
  skippedCount: number;
  schemaVersion: number;
}): void {
  emit({ type: "report_kpi_chart_migrated", ...payload });
}
