import type { ConfidenceBand } from "@/lib/ai/spare-parts/types/schemas";

export type RankingSignals = {
  visualMatch: number;
  vehicleMatch: number;
  catalogMatch: number;
  explodedViewMatch: number;
  partsTableMatch: number;
  oemCodeMatch: number;
  dimensionMatch: number;
  priceEvidence: number;
  webEvidence: number;
  historicalConfirmation: number;
};

const WEIGHTS: Record<keyof RankingSignals, number> = {
  vehicleMatch: 0.18,
  catalogMatch: 0.16,
  explodedViewMatch: 0.14,
  partsTableMatch: 0.12,
  oemCodeMatch: 0.12,
  visualMatch: 0.1,
  dimensionMatch: 0.05,
  priceEvidence: 0.05,
  historicalConfirmation: 0.05,
  webEvidence: 0.03,
};

export function computeConfidenceScore(signals: RankingSignals): number {
  let score = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof RankingSignals)[]) {
    const v = Math.max(0, Math.min(1, signals[key] ?? 0));
    score += v * WEIGHTS[key];
  }
  return Math.max(0, Math.min(1, score));
}

export function scoreToConfidenceBand(score: number): ConfidenceBand {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

export function confidenceBandLabel(band: ConfidenceBand): string {
  switch (band) {
    case "high":
      return "Alta affidabilità";
    case "medium":
      return "Media affidabilità";
    case "low":
      return "Bassa affidabilità";
  }
}

/** Web cannot outrank a strong OEM catalog match. */
export function applySourceHierarchyPenalty(
  signals: RankingSignals,
  hasStrongCatalog: boolean,
): RankingSignals {
  if (!hasStrongCatalog) return signals;
  return {
    ...signals,
    webEvidence: Math.min(signals.webEvidence, 0.35),
  };
}

export function isStructuredMatchClear(signals: RankingSignals): boolean {
  const catalogSignal = Math.max(signals.catalogMatch, signals.explodedViewMatch, signals.partsTableMatch);
  return catalogSignal >= 0.55 && signals.vehicleMatch >= 0.4;
}

export function shouldRunWebSearch(signals: RankingSignals): boolean {
  return !isStructuredMatchClear(signals);
}
