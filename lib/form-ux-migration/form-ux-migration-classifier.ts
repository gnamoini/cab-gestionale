import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import {
  classifyAllFormUxFields,
  classifyFormUxField,
  collectClassificationSignals,
  computeClassificationConfidence,
  type CodemodDisposition,
  type FormUxClassificationResult,
  type MigrationRiskTier,
  type MigrationSignal,
  type MigrationTierBand,
  type MigrationTierLabel,
} from "@/lib/form-ux-migration/form-ux-classification-engine";

export type {
  CodemodDisposition,
  MigrationRiskTier,
  MigrationSignal,
  MigrationTierBand,
  MigrationTierLabel,
  FormUxClassificationResult,
};

/** Backward-compat alias — pure classification only (no temporal fields). */
export type MigrationRiskProfile = FormUxClassificationResult;

export const collectMigrationSignals = collectClassificationSignals;
export const computeTier0ConfidenceScore = computeClassificationConfidence;

export function classifyMigrationField(
  field: MigrationInventoryField,
  options?: { root?: string },
): MigrationRiskProfile {
  return classifyFormUxField(field, options);
}

export function classifyAllFields(
  inventory: MigrationInventoryField[],
  options?: { root?: string },
): MigrationRiskProfile[] {
  return classifyAllFormUxFields(inventory, options);
}

/** Legacy classifier snapshot for before/after comparison. */
export function classifyMigrationFieldLegacy(
  field: MigrationInventoryField,
  options?: { root?: string },
): Pick<
  MigrationRiskProfile,
  "tier" | "tierBand" | "signals" | "codemodDisposition" | "tier0ConfidenceScore"
> {
  const profile = classifyFormUxField(field, options);

  const legacySignalMap = (s: MigrationSignal): string => {
    if (s === "onChange_controlled") return "onChange_handler";
    if (s === "onBlur_local" || s === "onBlur_submit_side_effect") return "onBlur_handler";
    if (s === "validation_ui_only") return "local_validation";
    return s;
  };

  const legacyList = profile.signals.map(legacySignalMap);
  let legacyTier: MigrationRiskTier = 3;

  if (
    legacyList.includes("rollout_critical_flag") ||
    legacyList.includes("critical_keyword") ||
    (legacyList.includes("critical_domain_path") &&
      (field.kind === "number" || legacyList.includes("submit_transform")))
  ) {
    legacyTier = 3;
  } else if (
    legacyList.includes("onBlur_handler") ||
    legacyList.includes("cross_field_sync") ||
    legacyList.includes("submit_transform") ||
    legacyList.includes("business_handler_on_typed_input")
  ) {
    legacyTier = 2;
  } else if (
    legacyList.includes("local_validation") ||
    legacyList.includes("helper_or_error_text") ||
    legacyList.includes("onChange_handler")
  ) {
    legacyTier = 1;
  } else {
    const safeKinds = new Set(["text", "textarea", "checkbox"]);
    if (safeKinds.has(field.kind) && legacyList.length === 0) legacyTier = 0;
    else if (field.kind === "number" || field.kind === "select") legacyTier = 2;
    else legacyTier = 1;
  }

  let disposition: CodemodDisposition = "REVIEW_REQUIRED";
  if (legacyTier >= 3 || field.formId == null || field.fieldId.startsWith("field-")) {
    disposition = "BLOCKED";
  } else if (legacyTier >= 1) {
    disposition = "REVIEW_REQUIRED";
  } else if (field.kind === "number" || field.kind === "text") {
    disposition = "SAFE_AUTO";
  }

  return {
    tier: legacyTier,
    tierBand: legacyTier === 0 ? "0" : (`${legacyTier}` as MigrationTierBand),
    signals: profile.signals,
    codemodDisposition: disposition,
    tier0ConfidenceScore: legacyTier === 0 ? 1 : 0,
  };
}

export function isWaveEligibleTier(profile: MigrationRiskProfile): boolean {
  return (
    (profile.tierBand === "0" || profile.tierBand === "0B") &&
    profile.codemodDisposition === "SAFE_AUTO"
  );
}
