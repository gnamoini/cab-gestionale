/**
 * @advisory v5.6 — dev-only cognitive surface metrics (no runtime impact).
 */
import {
  countRoutedEvents,
  routeCausalExplanation,
  type CausalSemanticIntent,
} from "@/lib/selector-core/selector-causal-semantic-router";
import type {
  BuildCausalModelInput,
  UnifiedSelectorCausalModel,
} from "@/lib/selector-core/selector-core-causal-model";

export type CognitiveSurfaceMetrics = {
  dependencyDepth: number;
  explanationSurfaceArea: number;
  conceptualComplexityScore: number;
};

const SEMANTIC_MODULE_COUNT = 4;

export function measureCognitiveSurface(options?: {
  model?: UnifiedSelectorCausalModel;
  intent?: CausalSemanticIntent;
  buildInput?: BuildCausalModelInput;
}): CognitiveSurfaceMetrics {
  const intent = options?.intent ?? "DEBUG";
  const buildInput = options?.buildInput ?? {};
  const routed = routeCausalExplanation(intent, buildInput);
  const model = options?.model ?? routed.model;

  const fullEventCount = model.events.length;
  const routedEventCount = countRoutedEvents(routed);
  const explanationSurfaceArea =
    fullEventCount === 0
      ? 0
      : Math.round((routedEventCount / fullEventCount) * 100);

  const dependencyDepth = SEMANTIC_MODULE_COUNT;

  let conceptualComplexityScore =
    dependencyDepth * 10 + Math.min(50, fullEventCount * 2);
  if (intent === "UX" || intent === "AUDIT") {
    conceptualComplexityScore = Math.max(0, conceptualComplexityScore - 15);
  }
  if (intent === "FORENSIC") {
    conceptualComplexityScore += 5;
  }

  return {
    dependencyDepth,
    explanationSurfaceArea,
    conceptualComplexityScore: Math.min(100, conceptualComplexityScore),
  };
}

export type ApiSurfaceReductionMetrics = {
  publicApiCountBefore: number;
  publicApiCountAfter: number;
  apiSurfaceDelta: number;
  hiddenInternalRatio: number;
  complexityRegression: boolean;
};

export function measureApiSurfaceReduction(
  before: readonly string[],
  after: readonly string[],
): ApiSurfaceReductionMetrics {
  const publicApiCountBefore = before.length;
  const publicApiCountAfter = after.length;
  const apiSurfaceDelta = publicApiCountAfter - publicApiCountBefore;
  const hiddenCount = Math.max(0, publicApiCountBefore - publicApiCountAfter);
  const hiddenInternalRatio =
    publicApiCountBefore === 0 ? 0 : hiddenCount / publicApiCountBefore;

  return {
    publicApiCountBefore,
    publicApiCountAfter,
    apiSurfaceDelta,
    hiddenInternalRatio,
    complexityRegression: apiSurfaceDelta > 0,
  };
}
