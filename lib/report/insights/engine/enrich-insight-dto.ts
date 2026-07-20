import { getInsightRuleByKey } from "@/lib/report/insights/registry/insight-rule-registry";
import type { InsightCandidate, EnrichedInsight } from "@/lib/report/insights/types";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";

export function enrichInsightDto(candidate: InsightCandidate): EnrichedInsight | null {
  const rule = getInsightRuleByKey(candidate.ruleKey);
  if (!rule) {
    reportMetricObserver.emit("insight_contract_violation", {
      consumer: "insight",
      metricId: candidate.ruleKey,
      ruleKey: candidate.ruleKey,
      ruleVersion: candidate.ruleVersion,
      violationType: "missing_registry_entry",
      severity: "error",
    });
    return null;
  }

  return {
    id: candidate.ruleKey,
    ruleKey: candidate.ruleKey,
    ruleVersion: candidate.ruleVersion,
    severity: candidate.severity,
    priority: candidate.priority,
    metricIds: [...candidate.metricIds],
    drillDown: rule.drillDown,
    trust: candidate.trust,
  };
}
