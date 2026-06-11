import fs from "node:fs";
import path from "node:path";
import type { FormUxClassificationResult } from "@/lib/form-ux-migration/form-ux-classification-engine";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { detectTier0BDrift } from "@/lib/form-ux-migration/form-ux-tier-drift-detector";
import { getWaveExclusionReasons } from "@/lib/form-ux-migration/form-ux-wave-exclusion-rules";
import type { TierDriftTrend } from "@/lib/form-ux-migration/form-ux-tier-drift-detector";
import { isTier0BLocked } from "@/lib/form-ux-migration/form-ux-tier-lock-registry";
import {
  evaluateTier0BContract,
  WAVE_TIER0B_STABILITY_THRESHOLD,
  type TierContractViolation,
} from "@/lib/form-ux-migration/form-ux-tier-semantic-contract";
import { resolveMapVersionContext } from "@/lib/form-ux-migration/form-ux-map-versioning";
import { validateRecalibratedCandidates } from "@/lib/form-ux-migration/form-ux-tier-validation-suite";

export type FormUxMigrationEligibility = {
  fieldKey: string;
  structurallyMigratable: boolean;
  contractPassed: boolean;
  contractViolations: TierContractViolation[];
  isLocked: boolean;
  driftScore: number;
  driftTrend: TierDriftTrend;
  semanticDriftPenalty: number;
  tier0bStabilityScore: number;
  waveStabilityPassed: boolean;
  validationPassed: boolean;
  eligibilityBlockers: string[];
  waveEligible: boolean;
  eligibilityReasons: string[];
  eligibilitySchemaVersion: string;
  evaluatedAgainstMapVersion: number;
};

function readFileContext(file: string, line: number, root: string): string {
  if (file === "rollout-config.ts" || line <= 0) return "";
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) return "";
  const lines = fs.readFileSync(abs, "utf8").split("\n");
  const start = Math.max(0, line - 7);
  const end = Math.min(lines.length, line + 6);
  return lines.slice(start, end).join("\n");
}

function isStructurallyMigratable(
  field: MigrationInventoryField,
  classification: FormUxClassificationResult,
): boolean {
  return (
    (classification.tierBand === "0" || classification.tierBand === "0B") &&
    classification.codemodDisposition === "SAFE_AUTO" &&
    field.status === "legacy" &&
    field.formId != null &&
    !field.fieldId.startsWith("field-")
  );
}

export function evaluateMigrationEligibility(
  field: MigrationInventoryField,
  classification: FormUxClassificationResult,
  options?: { root?: string },
): FormUxMigrationEligibility {
  const root = options?.root ?? process.cwd();
  const context = readFileContext(field.file, field.line, root);
  const structurallyMigratable = isStructurallyMigratable(field, classification);
  const eligibilityReasons: string[] = [];
  const eligibilityBlockers: string[] = [];

  const isLocked = isTier0BLocked(field.fieldKey, { root });

  const contract =
    classification.tierBand === "0B"
      ? evaluateTier0BContract(field, classification, context)
      : { passed: true, violations: [], contractPenalty: 0 };

  const drift =
    classification.tierBand === "0B"
      ? detectTier0BDrift(field, classification, { root, context })
      : {
          score: 0,
          trend: "stable" as TierDriftTrend,
        };

  const semanticDriftPenalty = isLocked
    ? 0
    : Math.max(drift.score, contract.contractPenalty);

  const tier0bStabilityScore = Math.max(
    0,
    Math.min(
      1,
      Math.round((classification.tier0ConfidenceScore - semanticDriftPenalty) * 100) / 100,
    ),
  );

  let waveStabilityPassed = true;
  if (classification.tierBand === "0B") {
    waveStabilityPassed =
      isLocked || tier0bStabilityScore >= WAVE_TIER0B_STABILITY_THRESHOLD;
    if (!waveStabilityPassed) {
      eligibilityBlockers.push("tier0b_stability_insufficient");
      eligibilityReasons.push("tier0b_stability_below_threshold");
    }
  }

  if (!contract.passed) {
    eligibilityBlockers.push("contract_violation");
    eligibilityReasons.push("tier0b_contract_failed");
  }

  if (drift.trend === "unstable" && !isLocked) {
    eligibilityBlockers.push("drift_unstable");
    eligibilityReasons.push("drift_trend_unstable");
  }

  const waveExclusion = structurallyMigratable
    ? getWaveExclusionReasons(field, classification, { root })
    : { excluded: false, reasons: [] };

  if (waveExclusion.excluded) {
    eligibilityBlockers.push("wave_exclusion");
    eligibilityReasons.push(`wave_exclusion:${waveExclusion.reasons.join(",")}`);
  }

  const validation =
    structurallyMigratable && !waveExclusion.excluded
      ? validateRecalibratedCandidates([{ field, profile: classification }])
      : { passed: true, violations: [], blockedFieldKeys: [] };

  if (!validation.passed) {
    eligibilityBlockers.push("validation_suite_failed");
    eligibilityReasons.push("validation_suite_failed");
  }

  if (!structurallyMigratable) {
    eligibilityReasons.push("not_structurally_migratable");
  }

  const waveEligible =
    structurallyMigratable &&
    !waveExclusion.excluded &&
    contract.passed &&
    waveStabilityPassed &&
    validation.passed &&
    !(drift.trend === "unstable" && !isLocked);

  const versionContext = resolveMapVersionContext();

  return {
    fieldKey: field.fieldKey,
    structurallyMigratable,
    contractPassed: contract.passed,
    contractViolations: contract.violations,
    isLocked,
    driftScore: drift.score,
    driftTrend: drift.trend,
    semanticDriftPenalty,
    tier0bStabilityScore,
    waveStabilityPassed,
    validationPassed: validation.passed,
    eligibilityBlockers,
    waveEligible,
    eligibilityReasons,
    eligibilitySchemaVersion: versionContext.eligibilitySchemaVersion,
    evaluatedAgainstMapVersion: classification.mapVersion,
  };
}
