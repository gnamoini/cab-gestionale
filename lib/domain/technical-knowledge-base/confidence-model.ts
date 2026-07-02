import type { ConfidenceFactors } from "@/lib/preventivi/description-engine/types";

export type ConfidenceTier = "high" | "medium" | "low";

export function computeAggregateConfidence(factors: ConfidenceFactors): number {
  const raw =
    factors.keywordMatch * 0.35 +
    factors.componentMatch * 0.25 +
    factors.symptomMatch * 0.15 +
    factors.compatibility * 0.15 -
    factors.legacyPenalty * 0.1;
  return Math.max(0, Math.min(1, Math.round(raw * 1000) / 1000));
}

export function confidenceTierFromScore(confidence: number): ConfidenceTier {
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.45) return "medium";
  return "low";
}

export function emptyConfidenceFactors(): ConfidenceFactors {
  return {
    keywordMatch: 0,
    componentMatch: 0,
    symptomMatch: 0,
    compatibility: 0,
    legacyPenalty: 0,
  };
}
