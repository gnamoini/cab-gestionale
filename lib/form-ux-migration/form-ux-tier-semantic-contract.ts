import type { FormUxClassificationResult } from "@/lib/form-ux-migration/form-ux-classification-engine";
import type { MigrationSignal } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";

export type TierContractInvariantId =
  | "no_cross_field_state"
  | "no_submit_mutation_coupling"
  | "no_persistence_coupling"
  | "no_async_external_store";

export type TierContractDefinition = {
  tierBand: "0B";
  invariants: TierContractInvariantId[];
  description: string;
};

export const TIER0B_DRIFT_DOWNGRADE_THRESHOLD = 0.4;
export const TIER0B_MAX_SEMANTIC_PENALTY = 0.35;
export const WAVE_TIER0B_STABILITY_THRESHOLD = 0.7;
export const TIER0B_DRIFT_STABLE_THRESHOLD = 0.2;

const EXTERNAL_STORE_PATTERN =
  /\b(zustand|useStore|dispatch\s*\(|useDispatch|useSelector|redux)\b/i;

const FOREIGN_SETSTATE_PATTERN = /\bset[A-Z]\w*\s*\(/;

export const Tier0BContract: TierContractDefinition = {
  tierBand: "0B",
  description:
    "Tier 0B fields must be locally controlled inputs without cross-field, submit, or persistence coupling.",
  invariants: [
    "no_cross_field_state",
    "no_submit_mutation_coupling",
    "no_persistence_coupling",
    "no_async_external_store",
  ],
};

export type TierContractViolation = {
  invariant: TierContractInvariantId;
  reason: string;
};

export type TierContractEvaluation = {
  passed: boolean;
  violations: TierContractViolation[];
  contractPenalty: number;
};

function hasSignal(signals: MigrationSignal[], id: MigrationSignal): boolean {
  return signals.includes(id);
}

export function evaluateTier0BContract(
  field: MigrationInventoryField,
  profile: Pick<FormUxClassificationResult, "signals">,
  context = "",
): TierContractEvaluation {
  const violations: TierContractViolation[] = [];
  const blob = `${field.snippet}\n${context}`;
  const { signals } = profile;

  if (hasSignal(signals, "cross_field_sync")) {
    violations.push({
      invariant: "no_cross_field_state",
      reason: "cross_field_sync signal detected",
    });
  }

  if (
    hasSignal(signals, "submit_transform") ||
    hasSignal(signals, "onBlur_submit_side_effect")
  ) {
    violations.push({
      invariant: "no_submit_mutation_coupling",
      reason: "submit or blur-submit coupling detected",
    });
  }

  if (hasSignal(signals, "persistence_side_effect")) {
    violations.push({
      invariant: "no_persistence_coupling",
      reason: "persistence_side_effect signal detected",
    });
  }

  if (
    EXTERNAL_STORE_PATTERN.test(blob) ||
    (/\buseEffect\b/.test(blob) && FOREIGN_SETSTATE_PATTERN.test(blob))
  ) {
    violations.push({
      invariant: "no_async_external_store",
      reason: "external store or foreign setState dependency detected",
    });
  }

  const contractPenalty = Math.min(
    TIER0B_MAX_SEMANTIC_PENALTY,
    violations.length * 0.2,
  );

  return {
    passed: violations.length === 0,
    violations,
    contractPenalty,
  };
}

export function isTier0BContractSatisfied(
  field: MigrationInventoryField,
  profile: Pick<FormUxClassificationResult, "signals">,
  context?: string,
): boolean {
  return evaluateTier0BContract(field, profile, context).passed;
}
