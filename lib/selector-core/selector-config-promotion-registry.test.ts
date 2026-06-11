import assert from "node:assert/strict";
import {
  approveProposal,
  createEmptyRegistryState,
  getProposalHistory,
  registerProposal,
  rejectProposal,
  rollbackToVersion,
  __resetPromotionRegistryForTests,
} from "@/lib/selector-core/selector-config-promotion-registry";
import type { SelectorConfigProposal } from "@/lib/selector-core/types";

const proposal: SelectorConfigProposal = {
  id: "prop-test-1",
  targetDomain: "addetti",
  proposedChange: { surfacePreference: "sheet", rolloutAdjustment: "ENABLED" },
  evidence: {
    metricsSummary: {
      totalOpens: 10,
      surfaceCounts: { dropdown: 10, sheet: 0, searchableDropdown: 0 },
      bucketCounts: { "2-5": 0, "6-20": 0, "20-100": 10, "100+": 0 },
      searchUsageRate: 1,
      sheetUsageRate: 0,
      dropdownRate: 1,
      fallbackRate: 0,
      avgDecisionLatencyMs: 2,
      mobileRate: 1,
      dropdownAbandonRate: null,
    },
    supportingInsights: ["test"],
  },
  riskAssessment: { riskLevel: "low", reasons: ["test"] },
  status: "proposed",
  confidence: 1,
  sampleSize: 10,
  createdAt: new Date().toISOString(),
  version: 1,
};

__resetPromotionRegistryForTests();
createEmptyRegistryState();
registerProposal(proposal);

approveProposal("prop-test-1", "human", "approved in test");
const approved = getProposalHistory("prop-test-1").find((e) => e.action === "approved");
assert.ok(approved);

rejectProposal("prop-test-1", "human", "rejected after rollback test setup");

__resetPromotionRegistryForTests();
createEmptyRegistryState();
registerProposal(proposal);
const versionBefore = 1;
approveProposal("prop-test-1", "human");
const rolled = rollbackToVersion(versionBefore);
assert.equal(rolled.proposals[0]?.status, "proposed");

console.log("selector-config-promotion-registry.test.ts OK");
