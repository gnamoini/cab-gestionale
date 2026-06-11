/**
 * @advisory v5.6 — semantic intent routing over single causal SSOT (views only, no data split).
 */
import {
  getCausalModel,
  getCausalView,
  type BuildCausalModelInput,
  type CausalModelView,
} from "@/lib/selector-core/selector-causal-model-interface";
import type { UnifiedSelectorCausalModel } from "@/lib/selector-core/selector-core-causal-model";

export type CausalSemanticIntent = "DEBUG" | "UX" | "AUDIT" | "FORENSIC";

export type CausalRoutingResult = {
  intent: CausalSemanticIntent;
  views: CausalModelView[];
  model: UnifiedSelectorCausalModel;
  reconstruction?: boolean;
};

function viewsForIntent(
  model: UnifiedSelectorCausalModel,
  intent: CausalSemanticIntent,
): CausalModelView[] {
  switch (intent) {
    case "DEBUG":
      return [getCausalView(model, "full")];
    case "UX":
      return [getCausalView(model, "decision"), getCausalView(model, "fallback")];
    case "AUDIT":
      return [getCausalView(model, "gc"), getCausalView(model, "temporal")];
    case "FORENSIC":
      return [getCausalView(model, "full")];
    default:
      return [getCausalView(model, "full")];
  }
}

export function routeCausalExplanation(
  intent: CausalSemanticIntent,
  input: BuildCausalModelInput,
): CausalRoutingResult {
  const model = getCausalModel(input);
  return routeExistingCausalModel(intent, model);
}

export function routeExistingCausalModel(
  intent: CausalSemanticIntent,
  model: UnifiedSelectorCausalModel,
): CausalRoutingResult {
  const views = viewsForIntent(model, intent);

  return {
    intent,
    views,
    model,
    reconstruction: intent === "FORENSIC" ? true : undefined,
  };
}

export function countRoutedEvents(result: CausalRoutingResult): number {
  return result.views.reduce((sum, view) => sum + view.eventCount, 0);
}
