import type { TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import type { InsightRuleDefinition } from "@/lib/report/insights/insight-rule-types";
import type { InsightCandidate, InsightEvaluationResult, InsightSkipReason } from "@/lib/report/insights/types";

export type { InsightRuleDefinition };

export function skip(
  ruleKey: string,
  ruleVersion: number,
  reason: InsightSkipReason,
): InsightEvaluationResult {
  return { status: "skipped", ruleKey, ruleVersion, reason };
}

export function fire(
  candidate: InsightCandidate,
): InsightEvaluationResult {
  return { status: "fired", candidate };
}

export function skipDeferred(rule: Pick<InsightRuleDefinition, "ruleKey" | "ruleVersion">): InsightEvaluationResult {
  return skip(rule.ruleKey, rule.ruleVersion, "deferred");
}

export function skipMissing(rule: Pick<InsightRuleDefinition, "ruleKey" | "ruleVersion">): InsightEvaluationResult {
  return skip(rule.ruleKey, rule.ruleVersion, "missing_data");
}

export function skipFalse(rule: Pick<InsightRuleDefinition, "ruleKey" | "ruleVersion">): InsightEvaluationResult {
  return skip(rule.ruleKey, rule.ruleVersion, "condition_false");
}

export function makeCandidate(
  rule: Pick<InsightRuleDefinition, "ruleKey" | "ruleVersion" | "severity" | "priority" | "metricIds">,
  payload: Record<string, string | number | boolean>,
  trust: TrustStatus = "GREEN",
): InsightCandidate {
  return {
    ruleKey: rule.ruleKey,
    ruleVersion: rule.ruleVersion,
    severity: rule.severity,
    priority: rule.priority,
    metricIds: [...rule.metricIds],
    trust,
    payload,
  };
}
