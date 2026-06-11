import { classifyAllFields } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import { evaluateMigrationEligibility } from "@/lib/form-ux-migration/form-ux-migration-eligibility-engine";
import { scanMigrationInventory } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { detectAllTier0BDrift } from "@/lib/form-ux-migration/form-ux-tier-drift-detector";
import { isTier0BStable } from "@/lib/form-ux-migration/form-ux-tier-lock-registry";
import { evaluateTier0BContract } from "@/lib/form-ux-migration/form-ux-tier-semantic-contract";
import { buildWaveExecutionPlan } from "@/lib/form-ux-migration/form-ux-wave-executor";

export type TierStabilityReport = {
  generatedAt: string;
  tier0bTotal: number;
  tier0bStable: number;
  tier0bUnstable: number;
  tier0bEligibilityExcluded: number;
  driftRiskLevel: "LOW" | "MEDIUM" | "HIGH";
  driftRiskExplanation: string[];
  waveImpact: {
    candidatesBeforeStabilization: number;
    candidatesAfterStabilization: number;
    delta: number;
  };
  recommendation: "APPROVE_STABILIZATION" | "HOLD";
  recommendationReasons: string[];
};

function countClassificationTier0BCandidates(
  fields: ReturnType<typeof scanMigrationInventory>["fields"],
  root: string,
): number {
  const profiles = classifyAllFields(fields, { root });
  let count = 0;
  for (const profile of profiles) {
    const field = fields.find((f) => f.fieldKey === profile.fieldKey);
    if (!field) continue;
    if (
      profile.tierBand === "0B" &&
      profile.codemodDisposition === "SAFE_AUTO" &&
      field.status === "legacy" &&
      field.formId != null &&
      !field.fieldId.startsWith("field-")
    ) {
      count += 1;
    }
  }
  return count;
}

export function buildTierStabilityReport(options?: { root?: string }): TierStabilityReport {
  const root = options?.root ?? process.cwd();
  const { fields } = scanMigrationInventory({ root });
  const profiles = classifyAllFields(fields, { root });
  const driftReport = detectAllTier0BDrift(fields, profiles, { root });

  const tier0bProfiles = profiles.filter((p) => p.tierBand === "0B");
  const tier0bTotal = tier0bProfiles.length;

  let tier0bStable = 0;
  let tier0bUnstable = 0;
  let tier0bEligibilityExcluded = 0;

  for (const profile of tier0bProfiles) {
    const field = fields.find((f) => f.fieldKey === profile.fieldKey)!;
    const eligibility = evaluateMigrationEligibility(field, profile, { root });
    const drift = driftReport.assessments.find((a) => a.fieldKey === profile.fieldKey);
    const contract = evaluateTier0BContract(field, profile);
    const stable = isTier0BStable(profile.fieldKey, {
      score: drift?.score ?? eligibility.semanticDriftPenalty,
      trend: drift?.trend ?? eligibility.driftTrend,
      contractPassed: contract.passed,
    }, { root });
    if (stable) tier0bStable += 1;
    else tier0bUnstable += 1;
    if (!eligibility.waveEligible && eligibility.structurallyMigratable) {
      tier0bEligibilityExcluded += 1;
    }
  }

  const candidatesBefore = countClassificationTier0BCandidates(fields, root);
  const wavePlan = buildWaveExecutionPlan(1, { root });
  const candidatesAfter = wavePlan.manifest.candidates.length;
  const delta = candidatesAfter - candidatesBefore;

  const unstablePct =
    tier0bProfiles.length > 0 ? tier0bUnstable / tier0bProfiles.length : 0;

  const driftRiskExplanation: string[] = [];
  let driftRiskLevel: TierStabilityReport["driftRiskLevel"] = "LOW";

  if (unstablePct > 0.25 || driftReport.unstableCount > 0) {
    driftRiskLevel = "HIGH";
    driftRiskExplanation.push("more_than_25pct_tier0b_unstable");
  } else if (unstablePct >= 0.1 || Math.abs(delta) >= 3) {
    driftRiskLevel = "MEDIUM";
    driftRiskExplanation.push("elevated_tier0b_instability_or_wave_delta");
  } else {
    driftRiskExplanation.push("tier0b_within_bounds");
  }

  if (candidatesAfter === 0 && candidatesBefore > 0) {
    driftRiskLevel = "HIGH";
    driftRiskExplanation.push("wave_would_empty_after_stabilization");
  }

  const recommendationReasons: string[] = [];
  let recommendation: TierStabilityReport["recommendation"] = "APPROVE_STABILIZATION";

  if (driftRiskLevel === "HIGH") {
    recommendation = "HOLD";
    recommendationReasons.push("high_drift_risk");
  }
  if (candidatesAfter === 0) {
    recommendation = "HOLD";
    recommendationReasons.push("no_wave_candidates_after_stabilization");
  }
  if (tier0bUnstable > 0 && driftRiskLevel !== "LOW") {
    recommendationReasons.push(`${tier0bUnstable}_unstable_tier0b_fields`);
  }
  if (tier0bEligibilityExcluded > 0) {
    recommendationReasons.push(`${tier0bEligibilityExcluded}_tier0b_eligibility_excluded`);
  }

  if (recommendationReasons.length === 0) {
    recommendationReasons.push("stability_within_threshold", "wave_candidates_available");
  }

  return {
    generatedAt: new Date().toISOString(),
    tier0bTotal,
    tier0bStable,
    tier0bUnstable,
    tier0bEligibilityExcluded,
    driftRiskLevel,
    driftRiskExplanation,
    waveImpact: {
      candidatesBeforeStabilization: candidatesBefore,
      candidatesAfterStabilization: candidatesAfter,
      delta,
    },
    recommendation,
    recommendationReasons,
  };
}
