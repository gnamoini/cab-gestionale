import { compareBaselineValue, deltaPct, type DateRange, type ReportCompareMode } from "@/lib/report/date-ranges";
import { parseMetricNumber } from "@/lib/report/adapters/parse-metric-number";
import type {
  ReportMetricApplicability,
  ReportMetricCompareState,
  ReportMetricTrendSemantics,
} from "@/lib/report/metrics/report-metric-types";

export function buildMetricCompareState(
  cur: number,
  prevRaw: number | null,
  curRange: DateRange | null,
  compareRange: DateRange | null,
  compareMode: ReportCompareMode | undefined,
): ReportMetricCompareState | null {
  if (!compareRange || !compareMode || compareMode === "none" || !curRange) {
    return null;
  }
  if (prevRaw == null) {
    return { status: "unavailable", reason: "no_history" };
  }
  const prev = compareBaselineValue(prevRaw, compareRange, curRange, compareMode);
  const delta = cur - prev;
  return {
    status: "available",
    previousValue: prev,
    deltaAbs: delta,
    deltaPercent: deltaPct(cur, prev),
  };
}

export function compareForApplicability(
  applicability: ReportMetricApplicability,
  compareMode: ReportCompareMode | undefined,
  built: ReportMetricCompareState | null,
): ReportMetricCompareState | null {
  if (!compareMode || compareMode === "none") return null;
  if (built != null) return built;
  switch (applicability) {
    case "snapshot":
      return { status: "unavailable", reason: "snapshot" };
    case "trend":
      return { status: "unavailable", reason: "period_not_applicable" };
    case "derived":
      return { status: "unavailable", reason: "not_loaded" };
    case "period":
      return { status: "unavailable", reason: "no_history" };
    default:
      return { status: "unavailable", reason: "no_history" };
  }
}

export function compareFromDeltaRows(
  curValue: number,
  rows: readonly { deltaAbs: string | null; deltaPct: number | null }[] | null | undefined,
): ReportMetricCompareState | null {
  if (!rows || rows.length === 0) return null;
  const row = rows[0]!;
  if (row.deltaPct == null && row.deltaAbs == null) return null;

  let deltaAbs: number | null = null;
  if (row.deltaAbs != null) {
    const raw = row.deltaAbs.trim();
    const sign = raw.startsWith("-") ? -1 : raw.startsWith("+") ? 1 : 1;
    deltaAbs = sign * Math.abs(parseMetricNumber(raw.replace(/^[+-]/, "")));
  }

  let previousValue = curValue;
  if (deltaAbs != null) {
    previousValue = curValue - deltaAbs;
  } else if (row.deltaPct != null && row.deltaPct !== 0) {
    previousValue = curValue / (1 + row.deltaPct / 100);
  }

  return {
    status: "available",
    previousValue,
    deltaAbs,
    deltaPercent: row.deltaPct,
  };
}

export function shouldInvertCompareTone(trendSemantics: ReportMetricTrendSemantics): boolean {
  return trendSemantics === "lower_is_better" || trendSemantics === "positive_when_decreasing";
}
