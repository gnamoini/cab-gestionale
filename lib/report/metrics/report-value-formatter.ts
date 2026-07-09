import type { ReportMetricUnit } from "@/lib/report/metrics/report-metric-types";

export type ReportValueFormatter =
  | "currency"
  | "integer"
  | "decimal"
  | "percentage"
  | "duration"
  | "date";

/** ponytail: mapping statico unit→formatter finché il registry non ha formatter esplicito ovunque. */
export function unitToReportFormatter(unit: ReportMetricUnit): ReportValueFormatter {
  switch (unit) {
    case "currency":
      return "currency";
    case "hours":
      return "duration";
    case "days":
      return "decimal";
    case "percentage":
      return "percentage";
    case "ratio":
      return "decimal";
    case "count":
    default:
      return "integer";
  }
}

export function formatReportMetricValue(
  value: number,
  formatter: ReportValueFormatter,
  locale = "it-IT",
): string {
  if (!Number.isFinite(value)) return "—";
  switch (formatter) {
    case "currency":
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(value);
    case "integer":
      return value.toLocaleString(locale, { maximumFractionDigits: 0 });
    case "decimal":
      return value.toLocaleString(locale, { maximumFractionDigits: 2 });
    case "percentage":
      return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
    case "duration":
      return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })} h`;
    case "date":
      return new Date(value).toLocaleDateString(locale);
    default:
      return String(value);
  }
}
