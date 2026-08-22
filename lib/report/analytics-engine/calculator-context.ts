import type { ReportMetricEnvelopeTrust } from "@/lib/report/metrics/report-metric-envelope";
import type { DateRange } from "@/lib/report/date-ranges";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";

export type AnalyticsScalarAvailability = "available" | "partial" | "not_available";

export type AnalyticsScalarResult = {
  value: number;
  trust: ReportMetricEnvelopeTrust;
  availability: AnalyticsScalarAvailability;
  formulaId: string;
};

export type AnalyticsCalculatorContext = {
  bundle: ReportAnalyticsSourceBundle;
  range: DateRange;
};

export type AnalyticsCalculatorFn = (ctx: AnalyticsCalculatorContext) => AnalyticsScalarResult;

export function unavailableResult(formulaId: string): AnalyticsScalarResult {
  return {
    value: 0,
    trust: "not_available",
    availability: "not_available",
    formulaId,
  };
}

export function partialResult(value: number, formulaId: string): AnalyticsScalarResult {
  return {
    value,
    trust: "partial",
    availability: "partial",
    formulaId,
  };
}

export function verifiedResult(value: number, formulaId: string): AnalyticsScalarResult {
  return {
    value,
    trust: "verified",
    availability: "available",
    formulaId,
  };
}

export function estimatedResult(value: number, formulaId: string): AnalyticsScalarResult {
  return {
    value,
    trust: "estimated",
    availability: "available",
    formulaId,
  };
}
