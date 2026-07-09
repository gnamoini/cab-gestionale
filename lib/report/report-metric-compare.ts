import { deltaPct, compareBaselineValue, type DateRange, type ReportCompareMode } from "@/lib/report/date-ranges";
import type { ReportMetricCompare, ReportDomainMetric, ReportMetricState } from "@/lib/report/report-domain-types";

export function buildReportMetricCompare(
  cur: number,
  prevRaw: number,
  curRange: DateRange,
  compareRange: DateRange,
  mode: ReportCompareMode,
  formatCompareValue: (n: number) => string,
): ReportMetricCompare {
  const prev = compareBaselineValue(prevRaw, compareRange, curRange, mode);
  return {
    label: "vs confronto",
    value: formatCompareValue(prev),
    deltaPct: deltaPct(cur, prev),
  };
}

export function metricAvailable(
  id: string,
  label: string,
  value: string,
  compare?: ReportMetricCompare | null,
): ReportDomainMetric {
  const state: ReportMetricState = compare
    ? { status: "available", value, compare }
    : { status: "available", value };
  return { id, label, state };
}

export function metricComparedNumber(
  id: string,
  label: string,
  cur: number,
  prevRaw: number | null,
  formatValue: (n: number) => string,
  curRange: DateRange,
  compareRange: DateRange | null | undefined,
  compareMode: ReportCompareMode | undefined,
): ReportDomainMetric {
  const value = formatValue(cur);
  if (!compareRange || !compareMode || compareMode === "none" || prevRaw == null) {
    return metricAvailable(id, label, value);
  }
  const compare = buildReportMetricCompare(cur, prevRaw, curRange, compareRange, compareMode, formatValue);
  return metricAvailable(id, label, value, compare);
}
