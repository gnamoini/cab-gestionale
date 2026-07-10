import type { ReportMetricUnit } from "@/lib/report/metrics/report-metric-types";
import {
  formatReportMetricValue as formatByFormatter,
  type ReportValueFormatter,
  unitToReportFormatter,
} from "@/lib/report/metrics/report-value-formatter";

/** @deprecated Preferire formatter esplicito da registry. */
export function formatReportMetricValue(
  value: number,
  unitOrFormatter: ReportMetricUnit | ReportValueFormatter,
  locale = "it-IT",
): string {
  const formatter =
    unitOrFormatter === "count" ||
    unitOrFormatter === "currency" ||
    unitOrFormatter === "hours" ||
    unitOrFormatter === "days" ||
    unitOrFormatter === "percentage" ||
    unitOrFormatter === "ratio"
      ? unitToReportFormatter(unitOrFormatter)
      : unitOrFormatter;
  return formatByFormatter(value, formatter, locale);
}
