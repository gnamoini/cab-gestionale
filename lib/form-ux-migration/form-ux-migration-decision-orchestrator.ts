import fs from "node:fs";
import path from "node:path";
import {
  classifyFormUxField,
  type FormUxClassificationResult,
} from "@/lib/form-ux-migration/form-ux-classification-engine";
import { evaluateMigrationEligibility } from "@/lib/form-ux-migration/form-ux-migration-eligibility-engine";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { scanMigrationInventory } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import {
  resolveCompatibilityStatus,
  resolveMapVersionContext,
  type MapCompatibilityStatus,
} from "@/lib/form-ux-migration/form-ux-map-versioning";
import { evaluatePromotion } from "@/lib/form-ux-migration/form-ux-promotion-gates";
import type { FormUxMigrationEligibility } from "@/lib/form-ux-migration/form-ux-migration-eligibility-engine";

export type FormUxFinalDecision = "INCLUDE" | "EXCLUDE" | "HOLD";

export type FormUxMigrationDecision = {
  classification: FormUxClassificationResult;
  eligibility: FormUxMigrationEligibility;
  finalDecision: FormUxFinalDecision;
  reasonTrace: string[];
  mapVersion: number;
  compatibilityStatus: MapCompatibilityStatus;
};

export type FormUxMigrationDecisionOptions = {
  root?: string;
  /** Test-only hook to simulate version mismatch without changing tier logic. */
  versionOverride?: Partial<
    Pick<FormUxClassificationResult, "mapVersion" | "classifierSchemaVersion">
  >;
};

function resolveFinalDecision(input: {
  field: MigrationInventoryField;
  classification: FormUxClassificationResult;
  eligibility: FormUxMigrationEligibility;
  root: string;
}): { finalDecision: FormUxFinalDecision; reasonTrace: string[] } {
  const reasonTrace: string[] = [];
  reasonTrace.push(`classification:${input.classification.tierBand}`);

  if (!input.eligibility.structurallyMigratable) {
    reasonTrace.push("eligibility:not_structurally_migratable");
    reasonTrace.push("decision:EXCLUDE");
    return { finalDecision: "EXCLUDE", reasonTrace };
  }

  if (!input.eligibility.waveEligible) {
    for (const reason of input.eligibility.eligibilityReasons) {
      reasonTrace.push(`eligibility:${reason}`);
    }
    reasonTrace.push("decision:EXCLUDE");
    return { finalDecision: "EXCLUDE", reasonTrace };
  }

  if (input.eligibility.driftTrend === "unstable" && !input.eligibility.isLocked) {
    reasonTrace.push("eligibility:drift_unstable");
    reasonTrace.push("decision:HOLD");
    return { finalDecision: "HOLD", reasonTrace };
  }

  const promotion = evaluatePromotion(input.field, { root: input.root });
  const gateA = promotion.find((v) => v.gate === "A");
  if (gateA && !gateA.eligible) {
    reasonTrace.push(`readiness:promotion_gate_a:${gateA.blockers.join(",")}`);
    reasonTrace.push("decision:HOLD");
    return { finalDecision: "HOLD", reasonTrace };
  }

  const telemetryPath = path.join(input.root, "map", "telemetry");
  if (!fs.existsSync(telemetryPath)) {
    reasonTrace.push("readiness:telemetry_path_missing");
    reasonTrace.push("decision:HOLD");
    return { finalDecision: "HOLD", reasonTrace };
  }

  reasonTrace.push("eligibility:wave_eligible");
  reasonTrace.push("decision:INCLUDE");
  return { finalDecision: "INCLUDE", reasonTrace };
}

export function resolveFormUxMigrationDecisionForField(
  field: MigrationInventoryField,
  options?: FormUxMigrationDecisionOptions,
): FormUxMigrationDecision {
  const root = options?.root ?? process.cwd();
  const versionContext = resolveMapVersionContext();
  let classification = classifyFormUxField(field, { root });

  if (options?.versionOverride) {
    classification = {
      ...classification,
      ...options.versionOverride,
    };
  }

  const eligibility = evaluateMigrationEligibility(field, classification, { root });
  const { finalDecision, reasonTrace } = resolveFinalDecision({
    field,
    classification,
    eligibility,
    root,
  });

  const compatibilityStatus = resolveCompatibilityStatus({
    mapVersion: classification.mapVersion,
    classifierSchemaVersion: classification.classifierSchemaVersion,
    eligibilitySchemaVersion: eligibility.eligibilitySchemaVersion,
    evaluatedAgainstMapVersion: eligibility.evaluatedAgainstMapVersion,
    runtime: versionContext,
  });

  if (compatibilityStatus !== "CURRENT") {
    reasonTrace.push(`version:${compatibilityStatus}`);
  }

  return {
    classification,
    eligibility,
    finalDecision,
    reasonTrace,
    mapVersion: versionContext.mapVersion,
    compatibilityStatus,
  };
}

export function resolveFormUxMigrationDecision(
  fieldKey: string,
  options?: FormUxMigrationDecisionOptions,
): FormUxMigrationDecision | null {
  const root = options?.root ?? process.cwd();
  const { fields } = scanMigrationInventory({ root });
  const field = fields.find((f) => f.fieldKey === fieldKey);
  if (!field) return null;
  return resolveFormUxMigrationDecisionForField(field, options);
}
