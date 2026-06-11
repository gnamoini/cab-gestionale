import { selectorEngineConfig } from "@/lib/selector-core/selector-engine-config";
import type { DecisionRuleBand, OptionCountBucket } from "@/lib/selector-core/types";

export function resolveDecisionRuleBand(optionCount: number): DecisionRuleBand {
  const [band5, band20, band100] = selectorEngineConfig.thresholds.optionCountBands;
  if (optionCount <= band5) return "2-5";
  if (optionCount <= band20) return "6-20";
  if (optionCount <= band100) return "20-100";
  return "100+";
}

export function bucketOptionCount(optionCount: number): OptionCountBucket {
  return resolveDecisionRuleBand(optionCount);
}
