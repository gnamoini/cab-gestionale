import type { DecisionPriority } from "@/lib/report/decision-center/types";
import type { DecisionRuleDefinition } from "@/lib/report/decision-center/rules/decision-rule-registry";
import { PRIORITY_MODEL_VERSION } from "@/lib/report/decision-center/versions";

const PRIORITY_RANK: Record<DecisionPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export type PriorityResult = {
  priority: DecisionPriority;
  priorityModelVersion: typeof PRIORITY_MODEL_VERSION;
  score: number;
};

/** Deterministic priority — versioned for audit (C4). */
export function computeDecisionPriority(
  rule: DecisionRuleDefinition,
  input: { insightCount: number; eventCount: number; maxSeverity: number },
): PriorityResult {
  let score = PRIORITY_RANK[rule.basePriority] * 10;
  score += Math.min(input.insightCount, 3) * 3;
  score += Math.min(input.eventCount, 4) * 2;
  score += input.maxSeverity * 2;

  let priority: DecisionPriority = rule.basePriority;
  if (score >= 55) priority = "critical";
  else if (score >= 40) priority = "high";
  else if (score >= 25) priority = "medium";
  else priority = "low";

  return { priority, priorityModelVersion: PRIORITY_MODEL_VERSION, score };
}
