import { formatReportMetricValue, type ReportValueFormatter } from "@/lib/report/metrics/report-value-formatter";

/** Formatter assi/tooltip chart — delega al SSOT report metriche. */
export function formatChartValue(value: number, formatter: ReportValueFormatter, locale = "it-IT"): string {
  return formatReportMetricValue(value, formatter, locale);
}
