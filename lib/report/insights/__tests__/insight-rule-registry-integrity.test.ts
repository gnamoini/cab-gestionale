import assert from "node:assert/strict";
import { assertValidDrillDownRef } from "@/lib/report/contracts/drill-down-contract";
import { INSIGHT_RULE_REGISTRY } from "@/lib/report/insights/registry/insight-rule-registry";
import { INSIGHT_P0_RULE_COUNT } from "@/lib/report/insights/types";

assert.equal(INSIGHT_RULE_REGISTRY.length, INSIGHT_P0_RULE_COUNT);

const keys = new Set<string>();
for (const rule of INSIGHT_RULE_REGISTRY) {
  assert.ok(rule.ruleKey.length > 0);
  assert.ok(rule.ruleVersion >= 1);
  assert.ok(!keys.has(rule.ruleKey), `duplicate ruleKey: ${rule.ruleKey}`);
  keys.add(rule.ruleKey);
  assertValidDrillDownRef(rule.drillDown);
  assert.ok(rule.metricIds.length > 0);
}

const deferred = INSIGHT_RULE_REGISTRY.filter((r) => r.applicability === "deferred");
assert.ok(deferred.length >= 1, "expected explicit deferred rules");

console.log("insight-rule-registry-integrity.test.ts OK");
