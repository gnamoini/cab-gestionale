import assert from "node:assert/strict";
import { compareOutcomes } from "@/lib/selector-core/selector-ab-simulator";
import type { SelectorConfigProposal } from "@/lib/selector-core/types";
import type { SelectorOpenEvent } from "@/lib/selector-core/selector-telemetry";

const proposal: SelectorConfigProposal = {
  id: "prop-addetti-1",
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

const events: SelectorOpenEvent[] = Array.from({ length: 10 }, (_, i) => ({
  event: "selector_open_event",
  eventId: `e-${i}`,
  domain: "addetti",
  surface: "dropdown",
  optionCountBucket: "20-100",
  searchUsed: true,
  isMobile: true,
  decisionLatencyMs: 2,
  fallbackUsed: false,
  recordedAt: i,
}));

const outcome = compareOutcomes(events, proposal);
assert.equal(outcome.proposalId, proposal.id);
assert.ok(outcome.proposed.searchEfficiency >= outcome.current.searchEfficiency);
assert.ok(["favor_proposed", "favor_current", "inconclusive"].includes(outcome.recommendation));

console.log("selector-ab-simulator.test.ts OK");
