import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";

/** Certified compare delta — reads deltaPercent when compare is available. */
export function resolveEnvelopeCompareDeltaPercent(env: ReportMetricEnvelope): number | null {
  const compare = env.metric.compare;
  if (!compare || compare.status !== "available") return null;
  const delta = compare.deltaPercent;
  return typeof delta === "number" && Number.isFinite(delta) ? delta : null;
}
