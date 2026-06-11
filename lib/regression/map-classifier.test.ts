/**
 * MAP — risk tier classification fixtures.
 */
import assert from "node:assert/strict";
import { classifyMigrationField } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { evaluateMigrationEligibility } from "@/lib/form-ux-migration/form-ux-migration-eligibility-engine";

function field(partial: Partial<MigrationInventoryField> & Pick<MigrationInventoryField, "fieldKey" | "fieldId">): MigrationInventoryField {
  return {
    formId: "ricambio",
    file: "components/test.tsx",
    line: 10,
    kind: "text",
    snippet: '<input type="text" />',
    status: "legacy",
    staticallyMigrated: false,
    source: "scan",
    ...partial,
  };
}

const safe = classifyMigrationField(
  field({ fieldKey: "ricambio.notes", fieldId: "notes", kind: "text" }),
);
assert.equal(safe.tier, 0);
assert.equal(safe.tierBand, "0");
assert.equal(safe.tier0ConfidenceScore, 1);
assert.equal(safe.codemodDisposition, "SAFE_AUTO");
assert.equal(safe.mapVersion, 1);
assert.equal(safe.classifierSchemaVersion, "v1");

const moderate = classifyMigrationField(
  field({
    fieldKey: "ricambio.name",
    fieldId: "name",
    snippet: '<input type="text" required />',
  }),
);
assert.equal(moderate.tier, 0);
assert.equal(moderate.tierBand, "0B");
assert.ok(moderate.tier0ConfidenceScore >= 0.65);
assert.equal(moderate.codemodDisposition, "SAFE_AUTO");
assert.equal(moderate.isRecalibratedTier0, true);

const contractFail = classifyMigrationField(
  field({
    fieldKey: "ricambio.ext",
    fieldId: "ext",
    snippet: '<input onChange={setX} /> const v = useStore(s => s.x)',
  }),
);
assert.equal(contractFail.tierBand, "0B");
const contractEligibility = evaluateMigrationEligibility(
  field({
    fieldKey: "ricambio.ext",
    fieldId: "ext",
    snippet: '<input onChange={setX} /> const v = useStore(s => s.x)',
  }),
  contractFail,
);
assert.equal(contractEligibility.waveEligible, false);

const high = classifyMigrationField(
  field({
    fieldKey: "ricambio.qty",
    fieldId: "qty",
    kind: "number",
    snippet: '<input type="number" onBlur={save} />',
  }),
);
assert.equal(high.tier, 2);
assert.equal(high.tierBand, "2");

const critical = classifyMigrationField(
  field({
    fieldKey: "ricambio.prezzo-listino",
    fieldId: "prezzo-listino",
    kind: "number",
    snippet: '<input type="number" id="prezzo-listino" />',
    file: "components/gestionale/magazzino/ricambio-form-fields.tsx",
  }),
);
assert.equal(critical.tier, 3);
assert.equal(critical.tierBand, "3");
assert.equal(critical.codemodDisposition, "BLOCKED");

const blockedMissingForm = classifyMigrationField(
  field({
    fieldKey: "unknown:1",
    fieldId: "field-1",
    formId: null,
  }),
);
assert.equal(blockedMissingForm.codemodDisposition, "BLOCKED");

console.log("map-classifier.test.ts OK");
