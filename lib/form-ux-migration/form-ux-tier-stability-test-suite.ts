import {
  classifyAllFields,
  classifyMigrationField,
} from "@/lib/form-ux-migration/form-ux-migration-classifier";
import { classifyFormUxField } from "@/lib/form-ux-migration/form-ux-classification-engine";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { scanMigrationInventory } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { resolveFormUxMigrationDecisionForField } from "@/lib/form-ux-migration/form-ux-migration-decision-orchestrator";
import { buildWaveExecutionPlan } from "@/lib/form-ux-migration/form-ux-wave-executor";
import { validateRecalibratedCandidates } from "@/lib/form-ux-migration/form-ux-tier-validation-suite";

export type TierStabilityCheck = {
  id: string;
  passed: boolean;
  detail: string;
};

export type TierStabilityCheckResult = {
  passed: boolean;
  checks: TierStabilityCheck[];
};

export function runTierStabilityChecks(options?: {
  root?: string;
  fixtureFields?: MigrationInventoryField[];
}): TierStabilityCheckResult {
  const root = options?.root ?? process.cwd();
  const checks: TierStabilityCheck[] = [];

  const inventoryFields = scanMigrationInventory({ root }).fields;
  const fields = options?.fixtureFields ?? inventoryFields;
  const profiles = classifyAllFields(fields, { root });

  const wavePlan = buildWaveExecutionPlan(1, { root });
  const waveCandidates = wavePlan.manifest.candidates.map((c) => {
    const field = inventoryFields.find((f) => f.fieldKey === c.fieldKey)!;
    const profile = classifyMigrationField(field, { root });
    return { field, profile };
  });

  const driftingInWave = wavePlan.manifest.candidates.filter((c) => {
    const field = inventoryFields.find((f) => f.fieldKey === c.fieldKey);
    if (!field) return false;
    const decision = resolveFormUxMigrationDecisionForField(field, { root });
    return decision.finalDecision === "INCLUDE" && !decision.eligibility.waveEligible;
  });
  checks.push({
    id: "no_drifting_tier0b_in_wave",
    passed: driftingInWave.length === 0,
    detail:
      driftingInWave.length === 0
        ? "All wave candidates have passing eligibility"
        : `${driftingInWave.length} candidates included without wave eligibility`,
  });

  const validation = validateRecalibratedCandidates(waveCandidates);
  checks.push({
    id: "no_pricing_cross_field_leakage",
    passed: validation.passed,
    detail: validation.passed
      ? "Validation suite passed"
      : `${validation.violations.length} validation violations`,
  });

  const run1 = classifyAllFields(fields, { root });
  const run2 = classifyAllFields(fields, { root });
  const deterministic = run1.every((p, i) => {
    const other = run2[i]!;
    return (
      p.fieldKey === other.fieldKey &&
      p.tierBand === other.tierBand &&
      p.tier === other.tier &&
      p.tier0ConfidenceScore === other.tier0ConfidenceScore &&
      p.codemodDisposition === other.codemodDisposition
    );
  });
  checks.push({
    id: "deterministic_classification",
    passed: deterministic,
    detail: deterministic
      ? "Classification output stable across consecutive runs"
      : "Classification output differed between runs",
  });

  const wave1 = buildWaveExecutionPlan(1, { root });
  const wave2 = buildWaveExecutionPlan(1, { root });
  const waveStable =
    wave1.manifest.candidates.map((c) => c.fieldKey).sort().join(",") ===
    wave2.manifest.candidates.map((c) => c.fieldKey).sort().join(",");
  checks.push({
    id: "wave_output_stability",
    passed: waveStable,
    detail: waveStable
      ? "Wave 1 candidate set stable across consecutive runs"
      : "Wave 1 candidate set changed between runs",
  });

  if (options?.fixtureFields) {
    const fixture = options.fixtureFields[0];
    if (fixture) {
      const a = classifyFormUxField(fixture, { root });
      const b = classifyFormUxField(fixture, { root });
      checks.push({
        id: "fixture_snapshot_determinism",
        passed: a.tierBand === b.tierBand && a.tier === b.tier,
        detail: `fixture ${fixture.fieldKey} tierBand=${a.tierBand}`,
      });
    }
  }

  const classificationUnaffected = profiles.every((p) => {
    const field = fields.find((f) => f.fieldKey === p.fieldKey);
    if (!field) return true;
    resolveFormUxMigrationDecisionForField(field, { root });
    const after = classifyFormUxField(field, { root });
    return after.tierBand === p.tierBand && after.tier === p.tier;
  });
  checks.push({
    id: "eligibility_does_not_mutate_classification",
    passed: classificationUnaffected,
    detail: classificationUnaffected
      ? "Eligibility evaluation does not change classification"
      : "Classification changed after eligibility evaluation",
  });

  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}
