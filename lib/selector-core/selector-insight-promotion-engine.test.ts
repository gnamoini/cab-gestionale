import assert from "node:assert/strict";
import {
  buildConfigProposal,
  evaluatePromotionEligibility,
  generateProposalsFromReport,
  __resetPromotionEngineForTests,
} from "@/lib/selector-core/selector-insight-promotion-engine";
import type { SelectorAdaptiveInsight, SelectorAdaptiveReport } from "@/lib/selector-core/types";

const addettiInsight: SelectorAdaptiveInsight = {
  domain: "addetti",
  currentBehavior: {
    preferredSurface: "dropdown",
    usageStats: {
      totalOpens: 50,
      surfaceCounts: { dropdown: 10, sheet: 0, searchableDropdown: 1 },
      bucketCounts: { "2-5": 0, "6-20": 1, "20-100": 9, "100+": 1 },
      searchUsageRate: 1,
      sheetUsageRate: 0,
      dropdownRate: 0.91,
      fallbackRate: 0,
      avgDecisionLatencyMs: 2.3,
      mobileRate: 0.91,
      dropdownAbandonRate: null,
    },
  },
  recommendation: {
    suggestedSurface: "sheet",
    confidence: 1,
    reason: ["searchUsageRate 100.0% with dominant dropdown"],
  },
};

const lowSampleInsight: SelectorAdaptiveInsight = {
  ...addettiInsight,
  domain: "report",
  currentBehavior: {
    ...addettiInsight.currentBehavior,
    usageStats: { ...addettiInsight.currentBehavior.usageStats, totalOpens: 3 },
  },
  recommendation: { suggestedSurface: "sheet", confidence: 0.9, reason: ["test"] },
};

__resetPromotionEngineForTests();

const eligible = evaluatePromotionEligibility(addettiInsight);
assert.equal(eligible.eligible, true);

const blocked = evaluatePromotionEligibility(lowSampleInsight);
assert.equal(blocked.eligible, false);
assert.ok(blocked.blockers.some((b) => b.includes("sampleSize")));

const proposal = buildConfigProposal(addettiInsight);
assert.ok(proposal);
assert.equal(proposal?.proposedChange.surfacePreference, "sheet");
assert.equal(proposal?.proposedChange.rolloutAdjustment, "ENABLED");

const report: SelectorAdaptiveReport = {
  generatedAt: new Date().toISOString(),
  eventCount: 14,
  insights: [addettiInsight, lowSampleInsight],
};

const proposals = generateProposalsFromReport(report);
assert.equal(proposals.length, 1);
assert.equal(proposals[0]?.targetDomain, "addetti");

console.log("selector-insight-promotion-engine.test.ts OK");
