/**
 * MAP temporal separation — classification truth vs migration eligibility.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { classifyFormUxField } from "@/lib/form-ux-migration/form-ux-classification-engine";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { evaluateMigrationEligibility } from "@/lib/form-ux-migration/form-ux-migration-eligibility-engine";
import { resolveFormUxMigrationDecisionForField } from "@/lib/form-ux-migration/form-ux-migration-decision-orchestrator";
import {
  type ClassifierSnapshotFile,
  writeClassifierSnapshot,
} from "@/lib/form-ux-migration/form-ux-tier-drift-detector";

function field(partial: Partial<MigrationInventoryField> & Pick<MigrationInventoryField, "fieldKey" | "fieldId">): MigrationInventoryField {
  return {
    formId: "settings",
    file: "components/gestionale/settings/general-form.tsx",
    line: 10,
    kind: "text",
    snippet: '<input type="text" />',
    status: "legacy",
    staticallyMigrated: false,
    source: "scan",
    ...partial,
  };
}

const controlled = field({
  fieldKey: "settings.label",
  fieldId: "label",
  snippet: '<input type="text" onChange={setLabel} required />',
});

const a = classifyFormUxField(controlled);
const b = classifyFormUxField(controlled);
assert.equal(a.tierBand, b.tierBand);
assert.equal(a.tier, b.tier);
assert.deepEqual(a.signals, b.signals);

const storeField = field({
  fieldKey: "settings.ext",
  fieldId: "ext",
  snippet: '<input onChange={setX} /> const v = useStore(s => s.x)',
});

const storeClassification = classifyFormUxField(storeField);
assert.equal(storeClassification.tierBand, "0B");

const storeEligibility = evaluateMigrationEligibility(storeField, storeClassification);
assert.equal(storeEligibility.contractPassed, false);
assert.equal(storeEligibility.waveEligible, false);

const storeDecision = resolveFormUxMigrationDecisionForField(storeField);
assert.equal(storeDecision.classification.tierBand, "0B");
assert.equal(storeDecision.finalDecision, "EXCLUDE");
assert.equal(storeDecision.compatibilityStatus, "CURRENT");
assert.ok(storeDecision.reasonTrace.length > 0);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "map-temporal-"));
const stabilityDir = path.join(tmpRoot, "map", "stability", "classifier-snapshots");
fs.mkdirSync(stabilityDir, { recursive: true });

const priorSnapshot: ClassifierSnapshotFile = {
  capturedAt: "2026-01-01T00:00:00.000Z",
  fields: [
    {
      fieldKey: "settings.label",
      tierBand: "0B",
      signals: ["onChange_controlled"],
      tier0ConfidenceScore: 0.95,
      capturedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};
fs.writeFileSync(
  path.join(stabilityDir, "prior.json"),
  JSON.stringify(priorSnapshot),
  "utf8",
);

const classificationNow = classifyFormUxField(controlled, { root: tmpRoot });
const eligibilityNow = evaluateMigrationEligibility(controlled, classificationNow, {
  root: tmpRoot,
});
assert.equal(classificationNow.tierBand, "0B");
assert.ok(eligibilityNow.driftScore >= 0);

writeClassifierSnapshot([classificationNow], { root: tmpRoot });
const classificationAfter = classifyFormUxField(controlled, { root: tmpRoot });
assert.equal(classificationAfter.tierBand, classificationNow.tierBand);

fs.rmSync(tmpRoot, { recursive: true, force: true });

console.log("form-ux-temporal-separation.test.ts OK");
