/**
 * @advisory v4 — rule-based insight generation. No ML, no runtime coupling.
 */
import type { SelectorDomainUsageStatsWithPreferred } from "@/lib/selector-core/selector-telemetry-aggregator";
import type {
  SelectorAdaptiveSuggestedSurface,
  SelectorSurfaceKind,
} from "@/lib/selector-core/types";

export const ADAPTIVE_RULE_THRESHOLDS = {
  highSearchUsage: 0.7,
  lowSheetUsage: 0.3,
  highLatencyMs: 15,
  highFallbackRate: 0.05,
  minSampleSize: 10,
  largeBucketSearchUsage: 0.5,
} as const;

export type AdaptiveRuleRecommendation = {
  suggestedSurface: SelectorAdaptiveSuggestedSurface;
  confidence: number;
  reason: string[];
  matchedRuleIds: string[];
};

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function sampleConfidence(totalOpens: number): number {
  if (totalOpens < ADAPTIVE_RULE_THRESHOLDS.minSampleSize) return 0;
  return clampConfidence(totalOpens / (ADAPTIVE_RULE_THRESHOLDS.minSampleSize * 3));
}

function isLargeBucketDominant(
  bucketCounts: SelectorDomainUsageStatsWithPreferred["bucketCounts"],
): boolean {
  const large = bucketCounts["20-100"] + bucketCounts["100+"];
  const total = Object.values(bucketCounts).reduce((sum, n) => sum + n, 0);
  if (total === 0) return false;
  return large / total > 0.5;
}

export function applyAdaptiveRules(
  stats: SelectorDomainUsageStatsWithPreferred,
): AdaptiveRuleRecommendation {
  const reasons: string[] = [];
  const matchedRuleIds: string[] = [];
  let suggestedSurface: SelectorAdaptiveSuggestedSurface = stats.preferredSurface;
  let confidence = sampleConfidence(stats.totalOpens);

  if (stats.totalOpens < ADAPTIVE_RULE_THRESHOLDS.minSampleSize) {
    return {
      suggestedSurface: stats.preferredSurface,
      confidence: 0,
      reason: [
        `rule.insufficientData: sample size ${stats.totalOpens} < ${ADAPTIVE_RULE_THRESHOLDS.minSampleSize}`,
      ],
      matchedRuleIds: ["rule.insufficientData"],
    };
  }

  if (stats.fallbackRate > ADAPTIVE_RULE_THRESHOLDS.highFallbackRate) {
    matchedRuleIds.push("rule.highFallback");
    reasons.push(
      `fallbackRate ${(stats.fallbackRate * 100).toFixed(1)}% exceeds ${ADAPTIVE_RULE_THRESHOLDS.highFallbackRate * 100}%`,
    );
    return {
      suggestedSurface: "review_config",
      confidence: clampConfidence(confidence + 0.4),
      reason: reasons,
      matchedRuleIds,
    };
  }

  if (
    stats.searchUsageRate > ADAPTIVE_RULE_THRESHOLDS.highSearchUsage &&
    stats.sheetUsageRate < ADAPTIVE_RULE_THRESHOLDS.lowSheetUsage &&
    stats.preferredSurface === "dropdown"
  ) {
    matchedRuleIds.push("rule.highSearchLowSheet");
    reasons.push(
      `searchUsageRate ${(stats.searchUsageRate * 100).toFixed(1)}% with dominant dropdown`,
    );
    suggestedSurface = stats.mobileRate > 0.5 ? "sheet" : "searchableDropdown";
    confidence = clampConfidence(confidence + 0.35);
  }

  if (
    stats.sheetUsageRate > ADAPTIVE_RULE_THRESHOLDS.lowSheetUsage &&
    stats.avgDecisionLatencyMs > ADAPTIVE_RULE_THRESHOLDS.highLatencyMs &&
    stats.preferredSurface === "sheet"
  ) {
    matchedRuleIds.push("rule.lowSheetHighLatency");
    reasons.push(
      `sheet latency ${stats.avgDecisionLatencyMs.toFixed(1)}ms exceeds ${ADAPTIVE_RULE_THRESHOLDS.highLatencyMs}ms`,
    );
    suggestedSurface = "dropdown";
    confidence = clampConfidence(confidence + 0.25);
  }

  if (
    isLargeBucketDominant(stats.bucketCounts) &&
    stats.preferredSurface === "dropdown" &&
    stats.searchUsageRate > ADAPTIVE_RULE_THRESHOLDS.largeBucketSearchUsage
  ) {
    matchedRuleIds.push("rule.largeBucketDropdown");
    reasons.push("large option buckets with search-heavy dropdown usage");
    suggestedSurface = "sheet";
    confidence = clampConfidence(confidence + 0.3);
  }

  if (matchedRuleIds.length === 0) {
    reasons.push("no adaptive rule matched — retain current preferred surface");
    suggestedSurface = stats.preferredSurface;
  }

  return {
    suggestedSurface,
    confidence: clampConfidence(confidence),
    reason: reasons,
    matchedRuleIds,
  };
}

export function keepCurrentRecommendation(
  preferredSurface: SelectorSurfaceKind,
  totalOpens: number,
): AdaptiveRuleRecommendation {
  return {
    suggestedSurface: preferredSurface,
    confidence: sampleConfidence(totalOpens),
    reason: ["insufficient signal — keep current surface"],
    matchedRuleIds: [],
  };
}
