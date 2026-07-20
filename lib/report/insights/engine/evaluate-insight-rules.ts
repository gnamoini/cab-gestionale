import { INSIGHT_RULE_REGISTRY } from "@/lib/report/insights/registry/insight-rule-registry";
import type { InsightRuleContext } from "@/lib/report/insights/insight-input";
import type { InsightEvaluationResult } from "@/lib/report/insights/types";
import { reportMetricObserver } from "@/lib/report/observability/report-metric-observability";

export function evaluateInsightRules(ctx: InsightRuleContext): InsightEvaluationResult[] {
  const results: InsightEvaluationResult[] = [];

  for (const rule of INSIGHT_RULE_REGISTRY) {
    const result = rule.evaluate(ctx);
    results.push(result);

    if (result.status === "skipped") {
      reportMetricObserver.emit("insight_rule_skipped", {
        consumer: "insight",
        metricId: result.ruleKey,
        ruleKey: result.ruleKey,
        ruleVersion: result.ruleVersion,
        reason: result.reason,
      });
    }
  }

  return results;
}
