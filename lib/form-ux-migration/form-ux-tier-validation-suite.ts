import type { FormUxClassificationResult } from "@/lib/form-ux-migration/form-ux-classification-engine";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";

export type TierValidationViolation = {
  fieldKey: string;
  rule: string;
  reason: string;
};

export type TierValidationResult = {
  passed: boolean;
  violations: TierValidationViolation[];
  blockedFieldKeys: string[];
};

const PRICE_PATTERN = /\b(prezzo|sconto|markup|stock|quantit)\b/i;

const HARD_BLOCK_SIGNALS = new Set([
  "cross_field_sync",
  "submit_transform",
  "persistence_side_effect",
  "rollout_critical_flag",
  "onBlur_submit_side_effect",
]);

export type TierValidationCandidate = {
  field: MigrationInventoryField;
  profile: FormUxClassificationResult;
};

export function validateRecalibratedCandidates(
  candidates: TierValidationCandidate[],
): TierValidationResult {
  const violations: TierValidationViolation[] = [];

  for (const { field, profile } of candidates) {
    const blob = `${field.fieldId}\n${field.snippet}`;

    if (PRICE_PATTERN.test(blob)) {
      violations.push({
        fieldKey: field.fieldKey,
        rule: "no_pricing_keywords",
        reason: "Pricing or inventory quantity keyword detected",
      });
    }

    for (const signal of profile.signals) {
      if (HARD_BLOCK_SIGNALS.has(signal)) {
        violations.push({
          fieldKey: field.fieldKey,
          rule: `hard_signal_${signal}`,
          reason: `Hard signal ${signal} must not enter Wave 1`,
        });
      }
    }

    if (field.kind === "select" && profile.signals.includes("business_handler_on_typed_input")) {
      violations.push({
        fieldKey: field.fieldKey,
        rule: "select_business_handler",
        reason: "Select with business handler remains REVIEW_REQUIRED",
      });
    }

    if (profile.tierBand === "3") {
      violations.push({
        fieldKey: field.fieldKey,
        rule: "tier3_leakage",
        reason: "Tier 3 field must not be a Wave 1 candidate",
      });
    }
  }

  const blockedFieldKeys = [...new Set(violations.map((v) => v.fieldKey))];

  return {
    passed: violations.length === 0,
    violations,
    blockedFieldKeys,
  };
}
