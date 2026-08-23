/**
 * SSOT numeric formatting for Report analytics UI.
 */
export {
  formatReportMetricValue,
  unitToReportFormatter,
  type ReportValueFormatter,
} from "@/lib/report/metrics/report-value-formatter";

export type ReportDeltaKind = "percent" | "absolute" | "points";

export type ReportDeltaInput = {
  kind: ReportDeltaKind;
  value: number | null;
  unitLabel?: string;
};

/** Standard period-over-period percent: +14,2% */
export function formatReportDeltaPercent(value: number | null, locale = "it-IT"): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
}

/** Absolute change: 12 lavorazioni in più */
export function formatReportDeltaAbsolute(
  value: number | null,
  unitLabel: string,
  locale = "it-IT",
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(locale, { maximumFractionDigits: 1 });
  if (value > 0) return `${formatted} ${unitLabel} in più`;
  if (value < 0) return `${formatted} ${unitLabel} in meno`;
  return `nessuna variazione`;
}

/** Percentage points: +2,1 punti */
export function formatReportDeltaPoints(value: number | null, locale = "it-IT"): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString(locale, { maximumFractionDigits: 1 })} punti`;
}

export function formatReportDelta(input: ReportDeltaInput, locale = "it-IT"): string | null {
  switch (input.kind) {
    case "percent":
      return formatReportDeltaPercent(input.value, locale);
    case "absolute":
      return formatReportDeltaAbsolute(input.value, input.unitLabel ?? "", locale);
    case "points":
      return formatReportDeltaPoints(input.value, locale);
    default:
      return null;
  }
}

/** Full compare line: +14,2% rispetto al periodo precedente */
export function formatReportCompareLine(deltaPercent: number | null, locale = "it-IT"): string | null {
  const pct = formatReportDeltaPercent(deltaPercent, locale);
  if (pct == null) return null;
  return `${pct} rispetto al periodo precedente`;
}

export function formatChartAxisDate(ymd: string, locale = "it-IT"): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(locale, { month: "short", year: "2-digit" }).replace(/\./g, "");
}

export function formatReportPeriodLabel(fromYmd: string, toYmd: string, locale = "it-IT"): string {
  const fmt = (ymd: string) => {
    const d = new Date(`${ymd}T12:00:00`);
    return Number.isNaN(d.getTime())
      ? ymd
      : d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  };
  return `${fmt(fromYmd)} → ${fmt(toYmd)}`;
}
