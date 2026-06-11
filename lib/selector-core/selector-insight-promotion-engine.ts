/**
 * @advisory v5 — insight promotion pipeline. Config apply delegated to v5.1 enforcer.
 */
import { computeDomainAwareConfidence } from "@/lib/selector-core/selector-confidence-model";
import type {
  SelectorAdaptiveInsight,
  SelectorAdaptiveReport,
  SelectorAdaptiveSuggestedSurface,
  SelectorConfigProposal,
  SelectorProposedChange,
  SelectorSurfaceKind,
} from "@/lib/selector-core/types";

export const PROMOTION_GATE_THRESHOLDS = {
  minConfidence: 0.75,
  minSampleSize: 10,
} as const;

export type PromotionEligibility = {
  eligible: boolean;
  blockers: string[];
};

let proposalCounter = 0;

export function __resetPromotionEngineForTests(): void {
  proposalCounter = 0;
}

function nextProposalId(domain: string): string {
  proposalCounter += 1;
  return `prop-${domain}-${proposalCounter}`;
}

function hasStableReason(insight: SelectorAdaptiveInsight): boolean {
  return insight.recommendation.reason.some(
    (r) => !r.includes("insufficientData") && !r.includes("no adaptive rule matched"),
  );
}

export function evaluatePromotionEligibility(insight: SelectorAdaptiveInsight): PromotionEligibility {
  const blockers: string[] = [];
  const { recommendation, currentBehavior } = insight;
  const stats = currentBehavior.usageStats;
  const adjustedConfidence = computeDomainAwareConfidence(insight);

  if (adjustedConfidence < PROMOTION_GATE_THRESHOLDS.minConfidence) {
    blockers.push(
      `confidence ${adjustedConfidence.toFixed(2)} < ${PROMOTION_GATE_THRESHOLDS.minConfidence}`,
    );
  }

  if (stats.totalOpens < PROMOTION_GATE_THRESHOLDS.minSampleSize) {
    blockers.push(
      `sampleSize ${stats.totalOpens} < ${PROMOTION_GATE_THRESHOLDS.minSampleSize}`,
    );
  }

  if (recommendation.suggestedSurface === "review_config") {
    blockers.push("suggestedSurface is review_config");
  }

  if (recommendation.suggestedSurface === currentBehavior.preferredSurface) {
    blockers.push("suggestedSurface matches current preferred surface");
  }

  if (!hasStableReason(insight)) {
    blockers.push("no stable supporting insight reason");
  }

  return { eligible: blockers.length === 0, blockers };
}

function mapSuggestedSurfaceToChange(
  suggested: SelectorAdaptiveSuggestedSurface,
  insight: SelectorAdaptiveInsight,
): SelectorProposedChange {
  if (suggested === "sheet") {
    return { surfacePreference: "sheet", rolloutAdjustment: "ENABLED" };
  }
  if (suggested === "searchableDropdown") {
    return { surfacePreference: "searchableDropdown" };
  }
  if (suggested === "dropdown") {
    const latencyDriven = insight.recommendation.reason.some((r) => r.includes("latency"));
    if (latencyDriven) {
      return {
        surfacePreference: "dropdown",
        rolloutAdjustment: "DISABLED",
        thresholdAdjustment: 20,
      };
    }
    return { surfacePreference: "dropdown", rolloutAdjustment: "DISABLED" };
  }
  return {};
}

function assessRisk(insight: SelectorAdaptiveInsight): SelectorConfigProposal["riskAssessment"] {
  const stats = insight.currentBehavior.usageStats;
  const reasons: string[] = [];
  let riskLevel: "low" | "medium" | "high" = "low";

  if (stats.fallbackRate > 0) {
    riskLevel = "high";
    reasons.push(`fallbackRate ${(stats.fallbackRate * 100).toFixed(1)}%`);
  }

  if (insight.recommendation.confidence < 0.85) {
    if (riskLevel !== "high") riskLevel = "medium";
    reasons.push(`raw confidence ${insight.recommendation.confidence.toFixed(2)} below 0.85`);
  }

  const adjusted = computeDomainAwareConfidence(insight);
  if (adjusted < 0.85 && adjusted !== insight.recommendation.confidence) {
    if (riskLevel === "low") riskLevel = "medium";
    reasons.push(`domain-adjusted confidence ${adjusted.toFixed(2)} below 0.85`);
  }

  if (stats.totalOpens < 20) {
    if (riskLevel === "low") riskLevel = "medium";
    reasons.push(`sample size ${stats.totalOpens} below 20`);
  }

  if (reasons.length === 0) {
    reasons.push("stable metrics with sufficient sample");
  }

  return { riskLevel, reasons };
}

export function buildConfigProposal(insight: SelectorAdaptiveInsight): SelectorConfigProposal | null {
  const eligibility = evaluatePromotionEligibility(insight);
  if (!eligibility.eligible) return null;

  const suggested = insight.recommendation.suggestedSurface;
  if (suggested === "review_config") return null;

  const rawConfidence = insight.recommendation.confidence;
  const adjustedConfidence = computeDomainAwareConfidence(insight);

  return {
    id: nextProposalId(insight.domain),
    targetDomain: insight.domain,
    proposedChange: mapSuggestedSurfaceToChange(suggested, insight),
    evidence: {
      metricsSummary: insight.currentBehavior.usageStats,
      supportingInsights: insight.recommendation.reason,
    },
    riskAssessment: assessRisk(insight),
    status: "proposed",
    rawConfidence,
    confidence: adjustedConfidence,
    sampleSize: insight.currentBehavior.usageStats.totalOpens,
    createdAt: new Date().toISOString(),
    version: 1,
  };
}

function dedupeByDomain(proposals: SelectorConfigProposal[]): SelectorConfigProposal[] {
  const byDomain = new Map<string, SelectorConfigProposal>();
  for (const proposal of proposals) {
    const existing = byDomain.get(proposal.targetDomain);
    if (!existing || proposal.confidence > existing.confidence) {
      byDomain.set(proposal.targetDomain, proposal);
    }
  }
  return [...byDomain.values()].sort((a, b) => a.targetDomain.localeCompare(b.targetDomain));
}

export function generateProposalsFromReport(
  report: SelectorAdaptiveReport,
): SelectorConfigProposal[] {
  proposalCounter = 0;
  const proposals: SelectorConfigProposal[] = [];

  for (const insight of report.insights) {
    const proposal = buildConfigProposal(insight);
    if (proposal) proposals.push(proposal);
  }

  return dedupeByDomain(proposals);
}

export function summarizeProposedSurface(change: SelectorProposedChange): SelectorSurfaceKind {
  return change.surfacePreference ?? "dropdown";
}
