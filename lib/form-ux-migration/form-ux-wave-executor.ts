import fs from "node:fs";
import path from "node:path";
import {
  classifyAllFields,
  type MigrationRiskProfile,
} from "@/lib/form-ux-migration/form-ux-migration-classifier";
import {
  resolveFormUxMigrationDecisionForField,
  type FormUxMigrationDecision,
  type FormUxMigrationDecisionOptions,
} from "@/lib/form-ux-migration/form-ux-migration-decision-orchestrator";
import {
  scanMigrationInventory,
  type MigrationInventoryField,
} from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { buildMigrationWaves } from "@/lib/form-ux-migration/form-ux-migration-queue";
import { evaluatePromotion } from "@/lib/form-ux-migration/form-ux-promotion-gates";
import {
  getWaveExclusionReasons,
  type WaveExclusionResult,
} from "@/lib/form-ux-migration/form-ux-wave-exclusion-rules";
import { getFormUxRegistryEntry } from "@/lib/form-ux-migration/form-ux-registry";
import type { MapCompatibilityStatus } from "@/lib/form-ux-migration/form-ux-map-versioning";
import { FORM_UX_ROLLOUT } from "@/lib/form-ux-migration/rollout-config";
import { emitFormUxMapVersionEvent } from "@/lib/form-ux-migration/telemetry";
import type { FormUxFormId, FormUxInputKind } from "@/lib/form-ux-migration/types";

export type WaveRegressionRisk = "LOW" | "MEDIUM" | "HIGH";

export type RollbackReadinessCheck = {
  id: string;
  passed: boolean;
};

export type RollbackReadiness = {
  checks: RollbackReadinessCheck[];
  allPassed: boolean;
};

export type PromotionSimulationStep = {
  step: number;
  mode: "legacy" | "shadow" | "ssot";
  enforcement: "off" | "warn" | "soft-ssot" | "hard-ssot";
  note: string;
};

export type WaveCandidate = {
  fieldKey: string;
  formId: FormUxFormId;
  fieldId: string;
  file: string;
  line: number;
  kind: FormUxInputKind;
  tier: 0;
  tierBand: "0" | "0B";
  tier0ConfidenceScore: number;
  recalibrationReasons: string[];
  codemodDisposition: "SAFE_AUTO";
  finalDecision: "INCLUDE";
  reasonTrace: string[];
  regressionRisk: WaveRegressionRisk;
  regressionReason: string;
  eligible: boolean;
  eligibilityBlockers: string[];
  readiness: RollbackReadiness;
  promotionSimulation: PromotionSimulationStep[];
};

export { getWaveExclusionReasons, type WaveExclusionResult };

export type WaveManifest = {
  wave: number;
  generatedAt: string;
  totalFields: number;
  estimatedRisk: "low";
  excludedCount: number;
  candidates: WaveCandidate[];
};

export type RolloutPatchEntry = {
  formId: FormUxFormId;
  fieldId: string;
  kind: FormUxInputKind;
  from: "legacy";
  to: "shadow";
  enforcement: "warn";
};

export type DriftAdjustedCandidate = {
  fieldKey: string;
  tierBand: "0B";
  reason: string;
  driftScore: number;
  tier0bStabilityScore: number;
};

export type IncompatibleVersionSkip = {
  fieldKey: string;
  compatibilityStatus: MapCompatibilityStatus;
  mapVersion: number;
};

export type WaveExecutionPlan = {
  manifest: WaveManifest;
  rolloutPatch: { wave: number; patches: RolloutPatchEntry[] };
  recommendation: "APPROVE" | "HOLD";
  recommendationReasons: string[];
  readinessScore: number;
  driftAdjustedCandidates: DriftAdjustedCandidate[];
  incompatibleVersionSkips: IncompatibleVersionSkip[];
};

const PILOT_DOMAIN_FILES = /magazzino\/ricambio|ricambio-form/i;

/** Reads eligibility wave stability gate (temporal layer only). */
export function passesTier0BWaveStabilityGate(
  eligibility: Pick<
    FormUxMigrationDecision["eligibility"],
    "waveStabilityPassed" | "isLocked"
  >,
  tierBand: "0" | "0B" | "1" | "2" | "3",
): boolean {
  if (tierBand === "0") return true;
  if (tierBand !== "0B") return false;
  return eligibility.isLocked || eligibility.waveStabilityPassed;
}

function assessRegressionRisk(input: {
  profile: MigrationRiskProfile;
  field: MigrationInventoryField;
  exclusion: WaveExclusionResult;
  eligible: boolean;
}): { risk: WaveRegressionRisk; reason: string } {
  if (input.exclusion.excluded) {
    return {
      risk: "HIGH",
      reason: `Excluded: ${input.exclusion.reasons.join(", ")}`,
    };
  }

  if (!input.eligible) {
    return {
      risk: "MEDIUM",
      reason: "Readiness or promotion gate not satisfied",
    };
  }

  if (input.field.kind === "number" || !PILOT_DOMAIN_FILES.test(input.field.file)) {
    return {
      risk: "MEDIUM",
      reason:
        input.field.kind === "number"
          ? "Simple numeric field — soak recommended before ssot"
          : "Non-pilot domain file path",
    };
  }

  return {
    risk: "LOW",
    reason: "Tier 0 safe field with full readiness",
  };
}

function assessRollbackReadiness(
  formId: FormUxFormId,
  field: MigrationInventoryField,
  root: string,
): RollbackReadiness {
  const checks: RollbackReadinessCheck[] = [
    {
      id: "registry_entry",
      passed: getFormUxRegistryEntry(formId) != null,
    },
    {
      id: "rollout_form",
      passed: FORM_UX_ROLLOUT[formId] != null,
    },
    {
      id: "telemetry_path",
      passed: fs.existsSync(path.join(root, "map", "telemetry")),
    },
    {
      id: "promotion_gate_a",
      passed:
        evaluatePromotion(field, { root }).find((v) => v.gate === "A")?.eligible === true,
    },
  ];

  return {
    checks,
    allPassed: checks.every((c) => c.passed),
  };
}

/** Inline promotion ladder — enforcement order only (read-only simulation). */
export function simulatePromotionPath(): PromotionSimulationStep[] {
  return [
    { step: 1, mode: "legacy", enforcement: "off", note: "baseline legacy" },
    { step: 2, mode: "shadow", enforcement: "off", note: "shadow evaluation only" },
    { step: 3, mode: "shadow", enforcement: "warn", note: "telemetry soak" },
    { step: 4, mode: "shadow", enforcement: "soft-ssot", note: "submit reconciliation trial" },
    { step: 5, mode: "ssot", enforcement: "hard-ssot", note: "full ssot enforcement" },
  ];
}

function buildCandidate(
  field: MigrationInventoryField,
  decision: FormUxMigrationDecision,
  root: string,
): {
  candidate: WaveCandidate | null;
  excluded: boolean;
  driftAdjusted: DriftAdjustedCandidate | null;
} {
  const { classification, eligibility, finalDecision } = decision;

  if (
    finalDecision === "EXCLUDE" &&
    classification.tierBand === "0B" &&
    eligibility.structurallyMigratable &&
    !eligibility.waveEligible
  ) {
    const reason =
      eligibility.eligibilityBlockers.includes("wave_exclusion")
        ? "wave_exclusion"
        : eligibility.eligibilityBlockers.includes("tier0b_stability_insufficient")
          ? "tier0b_stability_insufficient"
          : eligibility.eligibilityReasons[0] ?? "eligibility_failed";
    return {
      candidate: null,
      excluded: eligibility.eligibilityBlockers.includes("wave_exclusion"),
      driftAdjusted: {
        fieldKey: field.fieldKey,
        tierBand: "0B",
        reason,
        driftScore: eligibility.driftScore,
        tier0bStabilityScore: eligibility.tier0bStabilityScore,
      },
    };
  }

  if (finalDecision !== "INCLUDE") {
    return { candidate: null, excluded: false, driftAdjusted: null };
  }

  const exclusion = getWaveExclusionReasons(field, classification, { root });
  const formId = field.formId!;
  const readiness = assessRollbackReadiness(formId, field, root);
  const eligibilityBlockers = readiness.checks
    .filter((c) => !c.passed)
    .map((c) => c.id);

  const gateBlockers =
    evaluatePromotion(field, { root }).find((v) => v.gate === "A")?.blockers ?? [];
  for (const blocker of gateBlockers) {
    if (!eligibilityBlockers.includes(blocker)) {
      eligibilityBlockers.push(blocker);
    }
  }

  const eligible = readiness.allPassed && eligibilityBlockers.length === 0;

  const { risk, reason } = assessRegressionRisk({
    profile: classification,
    field,
    exclusion,
    eligible,
  });

  const tierBand: "0" | "0B" =
    classification.tierBand === "0B" ? "0B" : "0";

  const candidate: WaveCandidate = {
    fieldKey: field.fieldKey,
    formId,
    fieldId: field.fieldId,
    file: field.file,
    line: field.line,
    kind: field.kind,
    tier: 0,
    tierBand,
    tier0ConfidenceScore: classification.tier0ConfidenceScore,
    recalibrationReasons: classification.recalibrationReasons,
    codemodDisposition: "SAFE_AUTO",
    finalDecision: "INCLUDE",
    reasonTrace: decision.reasonTrace,
    regressionRisk: risk,
    regressionReason: reason,
    eligible,
    eligibilityBlockers,
    readiness,
    promotionSimulation: simulatePromotionPath(),
  };

  return { candidate, excluded: false, driftAdjusted: null };
}

export function extractWaveCandidates(
  waveNumber: number,
  options?: { root?: string },
): WaveCandidate[] {
  return buildWaveExecutionPlan(waveNumber, options).manifest.candidates;
}

export function buildWaveManifest(
  waveNumber: number,
  options?: { root?: string },
): WaveManifest {
  return buildWaveExecutionPlan(waveNumber, options).manifest;
}

export function buildRolloutPatch(manifest: WaveManifest): {
  wave: number;
  patches: RolloutPatchEntry[];
} {
  const patches: RolloutPatchEntry[] = manifest.candidates
    .filter((c) => c.eligible)
    .map((c) => ({
      formId: c.formId,
      fieldId: c.fieldId,
      kind: c.kind,
      from: "legacy" as const,
      to: "shadow" as const,
      enforcement: "warn" as const,
    }));

  return { wave: manifest.wave, patches };
}

function resolveRecommendation(plan: {
  manifest: WaveManifest;
  readinessScore: number;
  decisionsByKey: Map<string, FormUxMigrationDecision>;
}): { recommendation: "APPROVE" | "HOLD"; reasons: string[] } {
  const reasons: string[] = [];
  const { candidates } = plan.manifest;

  if (candidates.length === 0) {
    reasons.push("no_wave_candidates");
    return { recommendation: "HOLD", reasons };
  }

  const ineligible = candidates.filter((c) => !c.eligible);
  if (ineligible.length > 0) {
    reasons.push(`${ineligible.length}_candidates_not_eligible`);
  }

  const highRisk = candidates.filter((c) => c.regressionRisk === "HIGH");
  if (highRisk.length > 0) {
    reasons.push(`${highRisk.length}_high_regression_risk`);
  }

  const validationFailed = candidates.filter((c) =>
    c.eligibilityBlockers.includes("validation_suite_failed"),
  );
  if (validationFailed.length > 0) {
    reasons.push(`${validationFailed.length}_validation_suite_failed`);
  }

  if (plan.readinessScore < 100) {
    reasons.push(`readiness_score_${plan.readinessScore}`);
  }

  const unstable0B = plan.manifest.candidates.filter((c) => {
    if (c.tierBand !== "0B") return false;
    const decision = plan.decisionsByKey.get(c.fieldKey);
    return (
      decision?.eligibility.driftTrend === "unstable" &&
      !decision.eligibility.isLocked
    );
  });
  if (unstable0B.length > 0) {
    reasons.push(`${unstable0B.length}_unstable_tier0b`);
  }

  if (reasons.length === 0) {
    return { recommendation: "APPROVE", reasons: ["all_candidates_eligible_low_risk"] };
  }

  return { recommendation: "HOLD", reasons };
}

export function buildWaveExecutionPlan(
  waveNumber: number,
  options?: { root?: string; decisionOptions?: FormUxMigrationDecisionOptions },
): WaveExecutionPlan {
  const root = options?.root ?? process.cwd();
  const { fields } = scanMigrationInventory({ root });
  const profiles = classifyAllFields(fields, { root });
  const profileByKey = new Map(profiles.map((p) => [p.fieldKey, p]));
  const waves = buildMigrationWaves(profiles);
  const waveBucket = waves.find((w) => w.wave === waveNumber);
  const waveFieldKeys = new Set(waveBucket?.fields.map((f) => f.fieldKey) ?? []);

  const candidates: WaveCandidate[] = [];
  const driftAdjustedCandidates: DriftAdjustedCandidate[] = [];
  const incompatibleVersionSkips: IncompatibleVersionSkip[] = [];
  let excludedCount = 0;

  const decisionsByKey = new Map<string, FormUxMigrationDecision>();

  for (const field of fields) {
    if (!waveFieldKeys.has(field.fieldKey)) continue;
    const profile = profileByKey.get(field.fieldKey);
    if (!profile) continue;

    const decision = resolveFormUxMigrationDecisionForField(field, {
      root,
      ...options?.decisionOptions,
    });
    decisionsByKey.set(field.fieldKey, decision);

    if (decision.compatibilityStatus !== "CURRENT") {
      incompatibleVersionSkips.push({
        fieldKey: field.fieldKey,
        compatibilityStatus: decision.compatibilityStatus,
        mapVersion: decision.mapVersion,
      });
      emitFormUxMapVersionEvent({
        fieldKey: field.fieldKey,
        classifierVersion: decision.classification.classifierSchemaVersion,
        eligibilityVersion: decision.eligibility.eligibilitySchemaVersion,
        mapVersion: decision.mapVersion,
        compatibilityStatus: decision.compatibilityStatus,
        ts: Date.now(),
      });
      continue;
    }

    const result = buildCandidate(field, decision, root);
    if (result.driftAdjusted) {
      driftAdjustedCandidates.push(result.driftAdjusted);
      continue;
    }
    if (result.excluded) {
      excludedCount += 1;
      continue;
    }
    if (result.candidate) {
      candidates.push(result.candidate);
    }
  }

  const eligibleCount = candidates.filter((c) => c.eligible).length;
  const readinessScore =
    candidates.length > 0 ? Math.round((eligibleCount / candidates.length) * 100) : 0;

  const manifest: WaveManifest = {
    wave: waveNumber,
    generatedAt: new Date().toISOString(),
    totalFields: candidates.length,
    estimatedRisk: "low",
    excludedCount,
    candidates,
  };

  const rolloutPatch = buildRolloutPatch(manifest);
  const { recommendation, reasons } = resolveRecommendation({
    manifest,
    readinessScore,
    decisionsByKey,
  });

  return {
    manifest,
    rolloutPatch,
    recommendation,
    recommendationReasons: reasons,
    readinessScore,
    driftAdjustedCandidates,
    incompatibleVersionSkips,
  };
}

export function formatExecutiveSummary(
  plan: WaveExecutionPlan,
  impact?: { currentCoveragePct: number; projectedCoveragePct: number; deltaPct: number },
): string {
  const lines = [
    "=== Wave Executive Summary ===",
    "",
    `Wave: ${plan.manifest.wave}`,
    `Candidates: ${plan.manifest.totalFields}`,
    `Excluded (refine pass): ${plan.manifest.excludedCount}`,
    `Readiness score: ${plan.readinessScore}%`,
    `Recommendation: ${plan.recommendation}`,
  ];

  if (impact) {
    lines.push(
      `Coverage: ${impact.currentCoveragePct}% → ${impact.projectedCoveragePct}% (+${impact.deltaPct}%)`,
    );
  }

  const riskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const c of plan.manifest.candidates) {
    riskCounts[c.regressionRisk] += 1;
  }
  lines.push(
    `Risk profile: LOW=${riskCounts.LOW} MEDIUM=${riskCounts.MEDIUM} HIGH=${riskCounts.HIGH}`,
  );

  if (plan.recommendationReasons.length > 0) {
    lines.push(`Reasons: ${plan.recommendationReasons.join(", ")}`);
  }

  return lines.join("\n");
}

export function formatTechnicalSummary(plan: WaveExecutionPlan, artifactDir: string): string {
  const lines = [
    "=== Wave Technical Summary ===",
    "",
    `Manifest: ${artifactDir}/map-wave-${plan.manifest.wave}-manifest.json`,
    `Rollout patch: ${artifactDir}/map-wave-${plan.manifest.wave}-rollout-patch.json`,
    `Impact: ${artifactDir}/map-wave-${plan.manifest.wave}-impact.json`,
    "",
    `Eligible patches: ${plan.rolloutPatch.patches.length}`,
    "",
    "Candidates:",
  ];

  for (const c of plan.manifest.candidates.slice(0, 25)) {
    lines.push(
      `  ${c.fieldKey} | ${c.regressionRisk} | eligible=${c.eligible} | ${c.regressionReason}`,
    );
    if (c.eligibilityBlockers.length > 0) {
      lines.push(`    blockers: ${c.eligibilityBlockers.join(", ")}`);
    }
  }

  if (plan.manifest.candidates.length > 25) {
    lines.push(`  ... +${plan.manifest.candidates.length - 25} more`);
  }

  return lines.join("\n");
}
