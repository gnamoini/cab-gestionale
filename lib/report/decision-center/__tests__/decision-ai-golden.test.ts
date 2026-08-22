import assert from "node:assert/strict";
import { validateDecisionAiOutput } from "@/lib/report/decision-center/ai/validation/validate-decision-ai-output";
import type { DecisionCandidate } from "@/lib/report/decision-center/types";

const candidates: DecisionCandidate[] = [
  {
    candidateId: "dc_abc",
    candidateFingerprint: "fp",
    conditionHash: "ch",
    ruleKey: "STOCK_REORDER_REVIEW",
    title: "Valutare revisione soglia ricambio X",
    summary: "consumi +83%",
    rationale: "consumi in aumento",
    priority: "high",
    category: "inventory",
    trust: "partial",
    metricIds: ["ric-usati", "scorta"],
    insightRuleKeys: ["MAG_PARTS_SPIKE"],
    eventIds: [],
    evidence: { metrics: [], insightRuleKeys: [], eventIds: [], summary: "" },
    source: "rule_engine",
  },
];

const ok = validateDecisionAiOutput(
  {
    decisions: [
      {
        candidateId: "dc_abc",
        explanation: "Valutare revisione soglia ricambio X considerando consumi elevati.",
        wording: "qualified",
      },
    ],
  },
  candidates,
);
assert.equal(ok.verdict, "publishable");

const bad = validateDecisionAiOutput(
  {
    decisions: [
      {
        candidateId: "dc_abc",
        explanation: "Ordina immediatamente 50 pezzi.",
        wording: "assertive",
      },
    ],
  },
  candidates,
);
assert.notEqual(bad.verdict, "publishable");

const unknown = validateDecisionAiOutput(
  { decisions: [{ candidateId: "dc_missing", explanation: "x", wording: "qualified" }] },
  candidates,
);
assert.equal(unknown.verdict, "rejected");

console.log("decision-ai-golden.test.ts OK");
