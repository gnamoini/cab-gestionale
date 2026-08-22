import assert from "node:assert/strict";
import {
  buildCandidateFingerprint,
  buildConditionHash,
} from "@/lib/report/decision-center/fingerprint/decision-fingerprint";
import { canTransitionDecisionStatus } from "@/lib/report/decision-center/state/decision-status-transitions";
import { mergeCandidatesWithPersistence } from "@/lib/report/decision-center/engine/merge-decision-with-persistence";
import type { DecisionCandidate } from "@/lib/report/decision-center/types";

const fpA = buildCandidateFingerprint({
  ruleKey: "CUSTOMER_REVENUE_DROP",
  metricIds: ["eco_fatturato"],
  periodKey: "2026-01-01:2026-01-31:none",
  entity: { dimension: "cliente", entityId: "c1" },
});
const fpB = buildCandidateFingerprint({
  ruleKey: "CUSTOMER_REVENUE_DROP",
  metricIds: ["eco_fatturato"],
  periodKey: "2026-01-01:2026-01-31:none",
  entity: { dimension: "cliente", entityId: "c2" },
});
assert.notEqual(fpA, fpB, "entity-aware fingerprint");

assert.equal(canTransitionDecisionStatus("new", "acknowledged"), true);
assert.equal(canTransitionDecisionStatus("resolved", "new"), false);

const candidate: DecisionCandidate = {
  candidateId: "dc_test",
  candidateFingerprint: "fp1",
  conditionHash: "ch1",
  ruleKey: "BACKLOG_ESCALATION",
  title: "Test",
  summary: "s",
  rationale: "r",
  priority: "high",
  category: "operational",
  trust: "verified",
  metricIds: ["lav-aperti"],
  insightRuleKeys: [],
  eventIds: [],
  evidence: { metrics: [], insightRuleKeys: [], eventIds: [], summary: "" },
  source: "rule_engine",
};

const merged = mergeCandidatesWithPersistence([candidate], [
  {
    id: "uuid-1",
    candidate_fingerprint: "fp1",
    status: "acknowledged",
    condition_hash: "ch1",
    dismissed_condition_hash: null,
    ai_explanation: null,
    ai_status: null,
    acknowledged_at: "2026-01-01",
    resolved_at: null,
    dismissed_at: null,
    engine_version: "1.0.0",
    priority_model_version: "1.0.0",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
]);
assert.equal(merged[0]?.status, "acknowledged");

const dismissedHidden = mergeCandidatesWithPersistence(
  [{ ...candidate, conditionHash: "ch1" }],
  [
    {
      id: "uuid-1",
      candidate_fingerprint: "fp1",
      status: "dismissed",
      condition_hash: "ch1",
      dismissed_condition_hash: "ch1",
      ai_explanation: null,
      ai_status: null,
      acknowledged_at: null,
      resolved_at: null,
      dismissed_at: "2026-01-02",
      engine_version: "1.0.0",
      priority_model_version: "1.0.0",
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
    },
  ],
);
assert.equal(dismissedHidden.length, 0, "dismissed anti-loop");

console.log("decision-center-core.test.ts OK");
