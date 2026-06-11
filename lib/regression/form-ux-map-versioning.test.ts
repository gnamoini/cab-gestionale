/**
 * MAP versioning & compatibility layer — metadata binding and wave gating.
 */
import assert from "node:assert/strict";
import { classifyFormUxField } from "@/lib/form-ux-migration/form-ux-classification-engine";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { resolveFormUxMigrationDecisionForField } from "@/lib/form-ux-migration/form-ux-migration-decision-orchestrator";
import {
  isCompatibleMapVersion,
  MAP_VERSION,
  resolveCompatibilityStatus,
  resolveMapVersionContext,
} from "@/lib/form-ux-migration/form-ux-map-versioning";
import { buildWaveExecutionPlan } from "@/lib/form-ux-migration/form-ux-wave-executor";
import {
  clearFormUxMigrationEvents,
  getFormUxMapVersionEvents,
} from "@/lib/form-ux-migration/telemetry";

function field(
  partial: Partial<MigrationInventoryField> & Pick<MigrationInventoryField, "fieldKey" | "fieldId">,
): MigrationInventoryField {
  return {
    formId: "settings",
    file: "components/gestionale/settings/general-form.tsx",
    line: 10,
    kind: "text",
    snippet: '<input type="text" onChange={setLabel} required />',
    status: "legacy",
    staticallyMigrated: false,
    source: "scan",
    ...partial,
  };
}

const ctx = resolveMapVersionContext();
assert.equal(ctx.mapVersion, MAP_VERSION);
assert.equal(ctx.mapVersion, 1);
assert.equal(ctx.classifierSchemaVersion, "v1");
assert.equal(ctx.eligibilitySchemaVersion, "v1");

assert.equal(isCompatibleMapVersion(1, 1), true);
assert.equal(isCompatibleMapVersion(2, 1), false);
assert.equal(isCompatibleMapVersion(1, 2), true);

assert.equal(
  resolveCompatibilityStatus({
    mapVersion: 1,
    classifierSchemaVersion: "v1",
    eligibilitySchemaVersion: "v1",
    evaluatedAgainstMapVersion: 1,
  }),
  "CURRENT",
);

assert.equal(
  resolveCompatibilityStatus({
    mapVersion: 0,
    classifierSchemaVersion: "v1",
    eligibilitySchemaVersion: "v1",
    evaluatedAgainstMapVersion: 0,
  }),
  "LEGACY",
);

assert.equal(
  resolveCompatibilityStatus({
    mapVersion: 2,
    classifierSchemaVersion: "v1",
    eligibilitySchemaVersion: "v1",
    evaluatedAgainstMapVersion: 2,
  }),
  "FUTURE_INCOMPATIBLE",
);

assert.equal(
  resolveCompatibilityStatus({
    mapVersion: 1,
    classifierSchemaVersion: "v99",
    eligibilitySchemaVersion: "v1",
    evaluatedAgainstMapVersion: 1,
  }),
  "FUTURE_INCOMPATIBLE",
);

const sample = field({ fieldKey: "settings.label", fieldId: "label" });
const classification = classifyFormUxField(sample);
assert.equal(classification.mapVersion, 1);
assert.equal(classification.classifierSchemaVersion, "v1");

const decisionA = resolveFormUxMigrationDecisionForField(sample);
const decisionB = resolveFormUxMigrationDecisionForField(sample);
assert.equal(decisionA.compatibilityStatus, "CURRENT");
assert.equal(decisionB.compatibilityStatus, "CURRENT");
assert.equal(decisionA.mapVersion, 1);
assert.equal(decisionA.classification.mapVersion, decisionB.classification.mapVersion);
assert.equal(
  decisionA.classification.classifierSchemaVersion,
  decisionB.classification.classifierSchemaVersion,
);
assert.equal(
  decisionA.eligibility.eligibilitySchemaVersion,
  decisionB.eligibility.eligibilitySchemaVersion,
);

const futureDecision = resolveFormUxMigrationDecisionForField(sample, {
  versionOverride: { mapVersion: 2 },
});
assert.equal(futureDecision.compatibilityStatus, "FUTURE_INCOMPATIBLE");
assert.ok(futureDecision.reasonTrace.some((r) => r.startsWith("version:")));

const legacyDecision = resolveFormUxMigrationDecisionForField(sample, {
  versionOverride: { mapVersion: 0 },
});
assert.equal(legacyDecision.compatibilityStatus, "LEGACY");
assert.ok(legacyDecision.reasonTrace.some((r) => r === "version:LEGACY"));

clearFormUxMigrationEvents();
const baselinePlan = buildWaveExecutionPlan(1);
assert.equal(baselinePlan.incompatibleVersionSkips.length, 0);

const mismatchPlan = buildWaveExecutionPlan(1, {
  decisionOptions: { versionOverride: { mapVersion: 2 } },
});
assert.ok(mismatchPlan.incompatibleVersionSkips.length > 0);
for (const skip of mismatchPlan.incompatibleVersionSkips) {
  assert.equal(skip.compatibilityStatus, "FUTURE_INCOMPATIBLE");
}
assert.equal(mismatchPlan.manifest.candidates.length, 0);

const versionEvents = getFormUxMapVersionEvents();
assert.ok(versionEvents.length > 0);
assert.equal(versionEvents[0]!.compatibilityStatus, "FUTURE_INCOMPATIBLE");
assert.equal(versionEvents[0]!.classifierVersion, "v1");
assert.equal(versionEvents[0]!.eligibilityVersion, "v1");

console.log("form-ux-map-versioning.test.ts OK");
