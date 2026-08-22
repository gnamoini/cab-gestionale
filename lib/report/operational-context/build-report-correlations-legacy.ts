import { randomUUID } from "node:crypto";
import type { InsightDto } from "@/lib/report/insights/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { BusinessReportCorrelationRef, BusinessReportEventRef } from "@/lib/report/business-report/types";
import { resolveEnvelopeCompareDeltaPercent } from "@/lib/report/business-report/metrics/resolve-envelope-compare-delta";

/** P4-frozen correlation — behavior must not change. */
export type CorrelationBuildInput = {
  insights: InsightDto[];
  events: BusinessReportEventRef[];
  envelopesById: Map<string, ReportMetricEnvelope>;
};

export function buildReportCorrelationsLegacy(input: CorrelationBuildInput): BusinessReportCorrelationRef[] {
  const correlations: BusinessReportCorrelationRef[] = [];
  const spikeInsights = input.insights.filter(
    (i) => i.severity !== "info" || /SPIKE|BACKLOG|BREACH|HIGH|LOW/i.test(i.ruleKey),
  );

  for (const insight of spikeInsights.slice(0, 6)) {
    const metricId = insight.metricIds[0];
    if (!metricId) continue;
    const env = input.envelopesById.get(metricId);
    const delta = env ? resolveEnvelopeCompareDeltaPercent(env) : null;
    if (delta == null || Math.abs(delta) < 5) continue;

    const relatedEvents = input.events.filter(
      (e) =>
        e.insightRuleKeys?.includes(insight.ruleKey) ||
        e.metricIds?.some((m) => insight.metricIds.includes(m as never)),
    );

    for (const event of relatedEvents.slice(0, 2)) {
      correlations.push({
        id: randomUUID(),
        label: `${insight.ruleKey} ↔ ${event.headline.slice(0, 80)}`,
        association: "temporalmente_associato",
        metricIds: [...insight.metricIds],
        insightRuleKeys: [insight.ruleKey],
        eventIds: [event.id],
      });
    }
  }

  return correlations.slice(0, 8);
}
