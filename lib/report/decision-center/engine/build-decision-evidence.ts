import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import { resolveEnvelopeCompareDeltaPercent } from "@/lib/report/business-report/metrics/resolve-envelope-compare-delta";
import type { DecisionEvidence } from "@/lib/report/decision-center/types";
import type { DecisionRuleMatch } from "@/lib/report/decision-center/rules/decision-rule-registry";

export function buildDecisionEvidence(
  match: DecisionRuleMatch,
  envelopesById: Map<string, ReportMetricEnvelope>,
): DecisionEvidence {
  const metrics = match.metricIds.map((metricId) => {
    const env = envelopesById.get(metricId);
    const reg = getRegistryEntry(metricId);
    const label = reg?.label ?? metricId;
    const value =
      env && env.trust !== "not_available"
        ? formatReportMetricValue(env.metric.value, reg?.formatter ?? reg?.unit ?? "count")
        : "—";
    return {
      metricId,
      label,
      value,
      deltaPercent: env ? resolveEnvelopeCompareDeltaPercent(env) : null,
      trust: env?.trust ?? "not_available",
    };
  });

  const parts = metrics
    .filter((m) => m.deltaPercent != null)
    .map((m) => `${m.label} ${m.deltaPercent! > 0 ? "+" : ""}${m.deltaPercent!.toFixed(1)}%`);

  return {
    metrics,
    insightRuleKeys: [...match.insightRuleKeys],
    eventIds: [...match.eventIds],
    summary: parts.length ? parts.join(" · ") : match.summary,
  };
}
