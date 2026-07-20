import assert from "node:assert/strict";
import { renderInsightMessage } from "@/lib/report/insights/engine/render-insight-message";
import { INSIGHT_RULE_REGISTRY } from "@/lib/report/insights/registry/insight-rule-registry";
import {
  detectLanguageSeverity,
  signalSeverityLevel,
} from "@/lib/report/narrative/quality/detect-language-levels";

for (const rule of INSIGHT_RULE_REGISTRY) {
  if (rule.applicability === "deferred") continue;
  const message = renderInsightMessage({
    ruleKey: rule.ruleKey,
    ruleVersion: rule.ruleVersion,
    severity: rule.severity,
    priority: rule.priority,
    metricIds: [...rule.metricIds],
    trust: "GREEN",
    payload: { count: 3, days: 7, opened: 30, closed: 28, delta: 2 },
  });
  const languageSeverity = detectLanguageSeverity(message);
  const signalSeverity = signalSeverityLevel(rule.severity);
  assert.ok(
    languageSeverity <= signalSeverity,
    `${rule.ruleKey}: language severity ${languageSeverity} > signal ${signalSeverity} in "${message}"`,
  );
}

console.log("render-insight-message-severity.test.ts OK");
