import { parseMetricNumber } from "@/lib/report/adapters/parse-metric-number";
import { compareForApplicability } from "@/lib/report/metrics/build-metric-compare-state";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { ReportDomainMetric } from "@/lib/report/report-domain-types";
import type { ReportMetric, ReportMetricCompareState } from "@/lib/report/metrics/report-metric-types";
import type { ReportCompareMode } from "@/lib/report/date-ranges";

function legacyCompareToState(
  legacy: { value: string; deltaPct: number | null } | undefined,
  cur: number,
): ReportMetricCompareState | null {
  if (!legacy) return null;
  const prev = parseMetricNumber(legacy.value);
  const delta = cur - prev;
  return {
    status: "available",
    previousValue: prev,
    deltaAbs: delta,
    deltaPercent: legacy.deltaPct,
  };
}

export function fromDomainMetric(
  metric: ReportDomainMetric,
  compareMode?: ReportCompareMode,
): ReportMetric | null {
  const entry = getRegistryEntry(metric.id);
  if (!entry || entry.status === "deprecated") return null;

  const { state } = metric;
  if (state.status !== "available") {
    return {
      id: metric.id,
      value: 0,
      compare:
        compareMode && compareMode !== "none"
          ? { status: "unavailable", reason: state.status === "not_loaded" ? "not_loaded" : "no_history" }
          : null,
      source: { module: entry.sourceModule, trace: "fromDomainMetric" },
    };
  }

  const value = parseMetricNumber(state.value);
  let compare: ReportMetricCompareState | null = null;
  if (state.compare) {
    compare = legacyCompareToState(
      { value: state.compare.value, deltaPct: state.compare.deltaPct },
      value,
    );
  }
  compare = compareForApplicability(entry.applicability, compareMode, compare);

  return {
    id: metric.id,
    value,
    compare,
    source: { module: entry.sourceModule, trace: "fromDomainMetric" },
  };
}

export function fromDomainMetrics(
  metrics: readonly ReportDomainMetric[],
  compareMode?: ReportCompareMode,
): ReportMetric[] {
  const out: ReportMetric[] = [];
  for (const m of metrics) {
    const converted = fromDomainMetric(m, compareMode);
    if (converted) out.push(converted);
  }
  return out;
}
