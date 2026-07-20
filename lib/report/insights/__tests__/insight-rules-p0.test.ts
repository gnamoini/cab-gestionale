import assert from "node:assert/strict";
import {
  COMPLIANCE_INSIGHT_RULES,
  CROSS_INSIGHT_RULES,
  ECONOMICO_INSIGHT_RULES,
  LAVORAZIONI_INSIGHT_RULES,
  MAGAZZINO_INSIGHT_RULES,
  ORE_INSIGHT_RULES,
} from "@/lib/report/insights/rules/catalog";
import { INSIGHT_P0_RULE_COUNT } from "@/lib/report/insights/types";

const byDomain = [
  ["lavorazioni", LAVORAZIONI_INSIGHT_RULES],
  ["magazzino", MAGAZZINO_INSIGHT_RULES],
  ["ore", ORE_INSIGHT_RULES],
  ["economico", ECONOMICO_INSIGHT_RULES],
  ["cross", CROSS_INSIGHT_RULES],
  ["compliance", COMPLIANCE_INSIGHT_RULES],
] as const;

let total = 0;
for (const [domain, rules] of byDomain) {
  assert.ok(rules.length > 0, `${domain} must have rules`);
  for (const rule of rules) {
    assert.equal(rule.domain, domain);
  }
  total += rules.length;
}

assert.equal(total, INSIGHT_P0_RULE_COUNT);

console.log("insight-rules-p0.test.ts OK");
