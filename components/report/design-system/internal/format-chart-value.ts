import type { ReportValueFormatter } from "@/lib/report/metrics/report-value-formatter";

/** Formatter assi/tooltip chart — stesso enum del registry metriche. */
export function formatChartValue(value: number, formatter: ReportValueFormatter, locale = "it-IT"): string {
  if (!Number.isFinite(value)) return "—";
  switch (formatter) {
    case "currency":
      return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
        value,
      );
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
