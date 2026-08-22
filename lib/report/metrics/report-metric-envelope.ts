import { ymdFromDate, type DateRange, type ReportCompareMode } from "@/lib/report/date-ranges";
import { compareForApplicability } from "@/lib/report/metrics/build-metric-compare-state";
import type { ReportMetricRegistryEntry } from "@/lib/report/metrics/report-metric-types";
import type { ReportMetric, ReportMetricUnit } from "@/lib/report/metrics/report-metric-types";
import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";

export type ReportMetricEnvelopeTrust =
  | "verified"
  | "estimated"
  | "partial"
  | "not_available";

export type ReportMetricEnvelopeSemantics = "flow" | "snapshot";

export type ReportMetricEnvelope = {
  metric: ReportMetric;
  metricId: string;
  period: { from: string; to: string };
  unit: ReportMetricUnit;
  semantics: ReportMetricEnvelopeSemantics;
  trust: ReportMetricEnvelopeTrust;
  formulaId: string;
};

function applicabilityToSemantics(
  applicability: ReportMetricRegistryEntry["applicability"],
): ReportMetricEnvelopeSemantics {
  return applicability === "snapshot" ? "snapshot" : "flow";
}

function registryTrustToEnvelope(entry: ReportMetricRegistryEntry): ReportMetricEnvelopeTrust {
  if (entry.confidence === "estimated") return "estimated";
  if (entry.trust === "partial") return "partial";
  if (entry.trust === "snapshot" || entry.trust === "exact") return "verified";
  return "verified";
}

function resolveFormulaId(entry: ReportMetricRegistryEntry): string {
  if (entry.formula?.trim()) return entry.formula.trim();
  return entry.sourceModule;
}

export function buildReportMetricEnvelope(
  metric: ReportMetric,
  entry: ReportMetricRegistryEntry,
  period: DateRange,
  compareMode?: ReportCompareMode,
): ReportMetricEnvelope {
  const metricId = resolveCanonicalMetricId(metric.id);
  const compare =
    compareMode != null
      ? compareForApplicability(entry.applicability, compareMode, metric.compare)
      : metric.compare;

  return {
    metric: { ...metric, id: metricId, compare },
    metricId,
    period: { from: ymdFromDate(period.start), to: ymdFromDate(period.end) },
    unit: entry.unit,
    semantics: applicabilityToSemantics(entry.applicability),
    trust: registryTrustToEnvelope(entry),
    formulaId: resolveFormulaId(entry),
  };
}
