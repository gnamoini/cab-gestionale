import assert from "node:assert/strict";
import { applyAdaptiveRules, ADAPTIVE_RULE_THRESHOLDS } from "@/lib/selector-core/selector-adaptive-rules";
import type { SelectorDomainUsageStatsWithPreferred } from "@/lib/selector-core/selector-telemetry-aggregator";

function stats(partial: Partial<SelectorDomainUsageStatsWithPreferred>): SelectorDomainUsageStatsWithPreferred {
  return {
    totalOpens: 20,
    surfaceCounts: { dropdown: 20, sheet: 0, searchableDropdown: 0 },
    bucketCounts: { "2-5": 0, "6-20": 0, "20-100": 20, "100+": 0 },
    searchUsageRate: 0.8,
    sheetUsageRate: 0,
    dropdownRate: 1,
    fallbackRate: 0,
    avgDecisionLatencyMs: 3,
    mobileRate: 1,
    dropdownAbandonRate: null,
    preferredSurface: "dropdown",
    ...partial,
  };
}

const insufficient = applyAdaptiveRules(stats({ totalOpens: 3 }));
assert.equal(insufficient.confidence, 0);
assert.ok(insufficient.matchedRuleIds.includes("rule.insufficientData"));

const highSearch = applyAdaptiveRules(
  stats({
    totalOpens: ADAPTIVE_RULE_THRESHOLDS.minSampleSize,
    searchUsageRate: 0.85,
    sheetUsageRate: 0.05,
    preferredSurface: "dropdown",
  }),
);
assert.ok(highSearch.matchedRuleIds.includes("rule.highSearchLowSheet"));
assert.equal(highSearch.suggestedSurface, "sheet");

const highFallback = applyAdaptiveRules(
  stats({ fallbackRate: 0.1, preferredSurface: "dropdown" }),
);
assert.ok(highFallback.matchedRuleIds.includes("rule.highFallback"));
assert.equal(highFallback.suggestedSurface, "review_config");

const highLatencySheet = applyAdaptiveRules(
  stats({
    surfaceCounts: { dropdown: 0, sheet: 20, searchableDropdown: 0 },
    sheetUsageRate: 0.5,
    preferredSurface: "sheet",
    avgDecisionLatencyMs: 20,
    searchUsageRate: 0.2,
  }),
);
assert.ok(highLatencySheet.matchedRuleIds.includes("rule.lowSheetHighLatency"));
assert.equal(highLatencySheet.suggestedSurface, "dropdown");

console.log("selector-adaptive-rules.test.ts OK");
