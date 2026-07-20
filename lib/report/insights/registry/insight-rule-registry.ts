import { assertValidDrillDownRef } from "@/lib/report/contracts/drill-down-contract";
import type { InsightRuleDefinition } from "@/lib/report/insights/insight-rule-types";
import { ALL_INSIGHT_RULES } from "@/lib/report/insights/rules/catalog";
import type { InsightCandidate, InsightEvaluationResult } from "@/lib/report/insights/types";

function validateRule(rule: InsightRuleDefinition): void {
  if (rule.ruleVersion < 1) throw new Error(`ruleVersion < 1: ${rule.ruleKey}`);
  assertValidDrillDownRef(rule.drillDown);
}

for (const rule of ALL_INSIGHT_RULES) {
  validateRule(rule);
}

const keys = new Set<string>();
for (const rule of ALL_INSIGHT_RULES) {
  if (keys.has(rule.ruleKey)) throw new Error(`duplicate ruleKey: ${rule.ruleKey}`);
  keys.add(rule.ruleKey);
}

export const INSIGHT_RULE_REGISTRY: readonly InsightRuleDefinition[] = ALL_INSIGHT_RULES;

export function getInsightRuleByKey(ruleKey: string): InsightRuleDefinition | undefined {
  return INSIGHT_RULE_REGISTRY.find((r) => r.ruleKey === ruleKey);
}

export type { InsightCandidate, InsightEvaluationResult };
