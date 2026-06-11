/**
 * @advisory v5.6 — anti-monolith access facade for causal model (explainability only).
 */
import {
  buildUnifiedSelectorCausalModel,
  getDecisionView,
  getFallbackView,
  getFullCausalView,
  getGcView,
  getTemporalView,
  type BuildCausalModelInput,
  type CausalModelView,
  type CausalViewType,
  type UnifiedSelectorCausalModel,
} from "@/lib/selector-core/selector-core-causal-model";

export type { CausalViewType, CausalModelView, BuildCausalModelInput, UnifiedSelectorCausalModel };

export function getCausalModel(input: BuildCausalModelInput): UnifiedSelectorCausalModel {
  return buildUnifiedSelectorCausalModel(input);
}

export function getCausalView(
  model: UnifiedSelectorCausalModel,
  type: CausalViewType,
): CausalModelView {
  switch (type) {
    case "decision":
      return getDecisionView(model);
    case "fallback":
      return getFallbackView(model);
    case "gc":
      return getGcView(model);
    case "temporal":
      return getTemporalView(model);
    case "full":
      return getFullCausalView(model);
    default:
      return getFullCausalView(model);
  }
}
