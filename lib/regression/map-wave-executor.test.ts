/**
 * Wave 1 executor — filters, readiness, recommendation matrix.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { classifyMigrationField } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import {
  buildWaveExecutionPlan,
  getWaveExclusionReasons,
  simulatePromotionPath,
} from "@/lib/form-ux-migration/form-ux-wave-executor";

function field(partial: Partial<MigrationInventoryField> & { fieldKey: string; fieldId: string }): MigrationInventoryField {
  return {
    formId: "ricambio",
    file: "components/gestionale/magazzino/ricambio-form-fields.tsx",
    line: 10,
    kind: "text",
    snippet: '<input type="text" />',
    status: "legacy",
    staticallyMigrated: false,
    source: "scan",
    ...partial,
  };
}

const safeField = field({
  fieldKey: "settings.label",
  fieldId: "label",
  formId: "settings",
  file: "components/gestionale/settings/general-form.tsx",
});
const safeProfile = classifyMigrationField(safeField);
const safeExclusion = getWaveExclusionReasons(safeField, safeProfile);
assert.equal(safeExclusion.excluded, false);

const softSignalField = field({
  fieldKey: "settings.desc",
  fieldId: "desc",
  formId: "settings",
  file: "components/gestionale/settings/general-form.tsx",
  snippet: '<input type="text" onChange={setDesc} required />',
});
const softProfile = classifyMigrationField(softSignalField);
const softExclusion = getWaveExclusionReasons(softSignalField, softProfile);
assert.equal(softExclusion.excluded, false);
assert.equal(softProfile.tierBand, "0B");

const priceField = field({
  fieldKey: "ricambio.prezzo",
  fieldId: "prezzo",
  kind: "number",
  snippet: '<input type="number" id="prezzo" />',
});
const priceProfile = classifyMigrationField(priceField);
const priceExclusion = getWaveExclusionReasons(priceField, priceProfile);
assert.equal(priceExclusion.excluded, true);
assert.ok(priceExclusion.reasons.length > 0);

const onBlurField = field({
  fieldKey: "ricambio.sync",
  fieldId: "sync",
  snippet: '<input type="text" onBlur={save} />',
});
const onBlurProfile = classifyMigrationField(onBlurField);
const onBlurExclusion = getWaveExclusionReasons(onBlurField, onBlurProfile);
assert.equal(onBlurExclusion.excluded, true);

const promotionSteps = simulatePromotionPath();
assert.equal(promotionSteps.length, 5);
assert.equal(promotionSteps[0]!.mode, "legacy");
assert.equal(promotionSteps[4]!.enforcement, "hard-ssot");

const telemetryDir = path.join(process.cwd(), "map", "telemetry");
if (!fs.existsSync(telemetryDir)) {
  fs.mkdirSync(telemetryDir, { recursive: true });
}

const plan = buildWaveExecutionPlan(1);
assert.equal(plan.manifest.wave, 1);
assert.equal(plan.manifest.estimatedRisk, "low");
assert.ok(Array.isArray(plan.manifest.candidates));
assert.ok(Array.isArray(plan.driftAdjustedCandidates));
assert.ok(Array.isArray(plan.incompatibleVersionSkips));
assert.equal(plan.incompatibleVersionSkips.length, 0);
assert.ok(["APPROVE", "HOLD"].includes(plan.recommendation));

if (plan.manifest.candidates.length > 0) {
  for (const c of plan.manifest.candidates) {
    assert.equal(c.tier, 0);
    assert.ok(c.tierBand === "0" || c.tierBand === "0B");
    assert.ok(c.tier0ConfidenceScore >= 0);
    assert.equal(c.codemodDisposition, "SAFE_AUTO");
    assert.ok(c.regressionReason.length > 0);
    assert.equal(c.promotionSimulation.length, 5);
  }
}

if (plan.recommendation === "HOLD") {
  assert.ok(plan.recommendationReasons.length > 0);
}

console.log("map-wave-executor.test.ts OK");
