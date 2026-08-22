import { insightRuleLabel } from "@/lib/report/insights/insight-rule-labels";
import type { InsightDto } from "@/lib/report/insights/types";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { BusinessReportInsightItem } from "@/lib/report/business-report/types";
import { resolveEnvelopeCompareDeltaPercent } from "@/lib/report/business-report/metrics/resolve-envelope-compare-delta";

export type DeterministicInsightBuckets = {
  highlights: BusinessReportInsightItem[];
  concerns: BusinessReportInsightItem[];
  anomalies: BusinessReportInsightItem[];
};

function isPositiveRule(ruleKey: string): boolean {
  return /WIN|IMPROVE|CLOSED|COLLECTION_HIGH|CHIUS/i.test(ruleKey);
}

function isAnomalyRule(ruleKey: string, severity: InsightDto["severity"]): boolean {
  if (severity === "critical") return true;
  return /SPIKE|BREACH|ANOMAL|SLA|LATE/i.test(ruleKey);
}

function isConcernRule(ruleKey: string, severity: InsightDto["severity"]): boolean {
  if (severity === "warning" || severity === "critical") return true;
  return /LOW|DROP|HIGH|BACKLOG|OPEN|SLOW/i.test(ruleKey);
}

function envelopeDirection(env: ReportMetricEnvelope | undefined): "up" | "down" | "flat" | null {
  const delta = env ? resolveEnvelopeCompareDeltaPercent(env) : null;
  if (delta == null || !Number.isFinite(delta)) return null;
  if (delta > 2) return "up";
  if (delta < -2) return "down";
  return "flat";
}

function insightToItem(insight: InsightDto, bucketSeverity: BusinessReportInsightItem["severity"]): BusinessReportInsightItem {
  return {
    id: insight.id,
    ruleKey: insight.ruleKey,
    title: insightRuleLabel(insight.ruleKey) ?? insight.ruleKey,
    explanation: insight.message,
    severity: bucketSeverity,
    metricIds: [...insight.metricIds],
    insightRuleKeys: [insight.ruleKey],
  };
}

/** Deterministic classification — AI must not invent buckets. */
export function buildDeterministicInsightBuckets(
  insights: InsightDto[],
  envelopesById: Map<string, ReportMetricEnvelope>,
): DeterministicInsightBuckets {
  const highlights: BusinessReportInsightItem[] = [];
  const concerns: BusinessReportInsightItem[] = [];
  const anomalies: BusinessReportInsightItem[] = [];

  for (const insight of insights) {
    const primaryEnv = insight.metricIds[0] ? envelopesById.get(insight.metricIds[0]) : undefined;
    const direction = envelopeDirection(primaryEnv);

    if (isAnomalyRule(insight.ruleKey, insight.severity)) {
      anomalies.push(insightToItem(insight, "attention"));
      continue;
    }

    if (isPositiveRule(insight.ruleKey) || (insight.severity === "info" && direction === "up")) {
      highlights.push(insightToItem(insight, "positive"));
      continue;
    }

    if (isConcernRule(insight.ruleKey, insight.severity) || direction === "down") {
      concerns.push(insightToItem(insight, "negative"));
      continue;
    }

    if (insight.severity === "info") {
      highlights.push(insightToItem(insight, "neutral"));
    } else {
      concerns.push(insightToItem(insight, "attention"));
    }
  }

  return {
    highlights: highlights.slice(0, 8),
    concerns: concerns.slice(0, 8),
    anomalies: anomalies.slice(0, 6),
  };
}
