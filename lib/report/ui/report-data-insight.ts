import {
  formatReportCompareLine,
  formatReportDeltaAbsolute,
  formatReportDeltaPercent,
} from "@/lib/report/ui/report-number-format";

export type ReportDataInsightInput = {
  metricLabel: string;
  value: number | null;
  previousValue?: number | null;
  deltaPercent?: number | null;
  deltaAbsolute?: number | null;
  unitLabel?: string;
  trend?: "up" | "down" | "flat" | null;
};

/**
 * Deterministic insight from pre-calculated values only — no qualitative inference.
 */
export function buildReportDataInsight(input: ReportDataInsightInput): string | null {
  const { metricLabel, deltaPercent, deltaAbsolute, unitLabel, trend } = input;

  if (deltaPercent != null && Number.isFinite(deltaPercent)) {
    const line = formatReportCompareLine(deltaPercent);
    if (line) {
      const direction =
        trend === "up" ? "aumentat" : trend === "down" ? "diminuit" : "variat";
      const subject = metricLabel.toLowerCase();
      return `Il valore di ${subject} è ${direction}o: ${line}.`;
    }
  }

  if (deltaAbsolute != null && unitLabel) {
    const abs = formatReportDeltaAbsolute(deltaAbsolute, unitLabel);
    if (abs) return `${metricLabel}: ${abs} rispetto al periodo precedente.`;
  }

  if (input.value != null && input.previousValue != null && input.previousValue !== 0) {
    const pct =
      ((input.value - input.previousValue) / Math.abs(input.previousValue)) * 100;
    const formatted = formatReportDeltaPercent(pct);
    if (formatted) {
      return `${metricLabel}: ${formatted} rispetto al periodo precedente.`;
    }
  }

  return null;
}
