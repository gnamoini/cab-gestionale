import type { ReportMetricEnvelopeTrust } from "@/lib/report/metrics/report-metric-envelope";
import type { ReportAnalyticsTrustSummary } from "@/lib/report/analytics-engine/types";
import type { AnalyticsScalarResult } from "@/lib/report/analytics-engine/calculator-context";

const TRUST_RANK: Record<ReportMetricEnvelopeTrust, number> = {
  verified: 0,
  estimated: 1,
  partial: 2,
  not_available: 3,
};

export function mergeScalarTrust(
  envelopeTrust: ReportMetricEnvelopeTrust,
  scalar: AnalyticsScalarResult,
): ReportMetricEnvelopeTrust {
  const b = scalar.trust;
  return TRUST_RANK[envelopeTrust] >= TRUST_RANK[b] ? envelopeTrust : b;
}

export function aggregateTrustSummary(
  trusts: readonly ReportMetricEnvelopeTrust[],
): ReportAnalyticsTrustSummary {
  const summary: ReportAnalyticsTrustSummary = {
    exact: 0,
    estimated: 0,
    partial: 0,
    notAvailable: 0,
    lowestTrust: "verified",
  };
  for (const t of trusts) {
    if (t === "verified") summary.exact += 1;
    else if (t === "estimated") summary.estimated += 1;
    else if (t === "partial") summary.partial += 1;
    else summary.notAvailable += 1;
    if (TRUST_RANK[t] > TRUST_RANK[summary.lowestTrust]) {
      summary.lowestTrust = t;
    }
  }
  return summary;
}
