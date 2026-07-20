import { getInsightRuleByKey } from "@/lib/report/insights/registry/insight-rule-registry";
import type { InsightCandidate, InsightEvaluationResult } from "@/lib/report/insights/types";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";

export function trustFilterFiredCandidates(
  results: InsightEvaluationResult[],
): InsightCandidate[] {
  const candidates: InsightCandidate[] = [];

  for (const result of results) {
    if (result.status !== "fired") continue;

    const rule = getInsightRuleByKey(result.candidate.ruleKey);
    const { candidate } = result;

    if (candidate.trust === "RED") {
      reportMetricObserver.emit("insight_rule_skipped", {
        consumer: "insight",
        metricId: candidate.ruleKey,
        ruleKey: candidate.ruleKey,
        ruleVersion: candidate.ruleVersion,
        reason: "trust_blocked",
      });
      continue;
    }

    if (rule?.requiresTrust?.length && !rule.requiresTrust.includes(candidate.trust)) {
      reportMetricObserver.emit("insight_rule_skipped", {
        consumer: "insight",
        metricId: candidate.ruleKey,
        ruleKey: candidate.ruleKey,
        ruleVersion: candidate.ruleVersion,
        reason: "trust_blocked",
      });
      continue;
    }

    candidates.push(candidate);
  }

  return candidates;
}
