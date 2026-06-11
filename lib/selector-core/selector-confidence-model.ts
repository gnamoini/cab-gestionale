/**
 * @advisory v5.1 — domain-aware confidence model. Offline only.
 */
import type { SelectorAdaptiveInsight } from "@/lib/selector-core/types";

export const DOMAIN_WEIGHTS: Readonly<Record<string, number>> = {
  lavorazioni: 1.0,
  schede: 0.98,
  mezzi: 0.97,
  magazzino: 0.96,
  addetti: 0.95,
  dipendenti: 0.95,
  report: 0.8,
  dashboard_filters: 0.75,
  security: 0.85,
  unknown: 0.7,
};

export const CONFIDENCE_SAMPLE_MIN = 10;
export const CONFIDENCE_SAMPLE_PLATEAU = 50;

export function getDomainWeight(domain: string): number {
  return DOMAIN_WEIGHTS[domain] ?? DOMAIN_WEIGHTS.unknown ?? 0.7;
}

export function computeSampleSizeFactor(sampleSize: number): number {
  if (sampleSize <= 0) return 0;
  if (sampleSize >= CONFIDENCE_SAMPLE_PLATEAU) return 1;
  if (sampleSize <= CONFIDENCE_SAMPLE_MIN) {
    return sampleSize / CONFIDENCE_SAMPLE_MIN;
  }
  const ramp =
    (sampleSize - CONFIDENCE_SAMPLE_MIN) / (CONFIDENCE_SAMPLE_PLATEAU - CONFIDENCE_SAMPLE_MIN);
  return 0.5 + ramp * 0.5;
}

export function computeDataQualityFactor(insight: SelectorAdaptiveInsight): number {
  const stats = insight.currentBehavior.usageStats;
  const reasons = insight.recommendation.reason;
  let factor = 1;

  if (reasons.some((r) => r.includes("insufficientData"))) {
    factor *= 0.5;
  }
  if (stats.fallbackRate > 0.1) {
    factor *= 0.85;
  }
  if (stats.fallbackRate > 0.25) {
    factor *= 0.7;
  }

  const bucketTotal = Object.values(stats.bucketCounts).reduce((a, b) => a + b, 0);
  const nonZeroBuckets = Object.values(stats.bucketCounts).filter((c) => c > 0).length;
  if (bucketTotal > 0 && nonZeroBuckets <= 1) {
    factor *= 0.9;
  }

  return Math.min(1, Math.max(0, factor));
}

export function computeDomainAwareConfidence(insight: SelectorAdaptiveInsight): number {
  const baseConfidence = insight.recommendation.confidence;
  const domainWeight = getDomainWeight(insight.domain);
  const dataQualityFactor = computeDataQualityFactor(insight);
  const sampleSizeFactor = computeSampleSizeFactor(insight.currentBehavior.usageStats.totalOpens);

  const adjusted = baseConfidence * domainWeight * dataQualityFactor * sampleSizeFactor;
  return Math.min(1, Math.max(0, adjusted));
}
