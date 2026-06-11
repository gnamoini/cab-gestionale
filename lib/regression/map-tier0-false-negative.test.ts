/**
 * MAP Tier 0B — controlled input recalibration vs pricing block.
 */
import assert from "node:assert/strict";
import {
  classifyMigrationField,
  classifyMigrationFieldLegacy,
} from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { analyzeTier0FalseNegatives } from "@/lib/form-ux-migration/form-ux-tier0-false-negative-analyzer";

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

const controlled = classifyMigrationField(
  field({
    fieldKey: "ricambio.notes",
    fieldId: "notes",
    snippet: '<input type="text" onChange={(e) => setNotes(e.target.value)} />',
  }),
);
const controlledLegacy = classifyMigrationFieldLegacy(
  field({
    fieldKey: "ricambio.notes",
    fieldId: "notes",
    snippet: '<input type="text" onChange={(e) => setNotes(e.target.value)} />',
  }),
);
assert.ok(controlledLegacy.tier >= 1);
assert.equal(controlled.tierBand, "0B");
assert.equal(controlled.tier, 0);
assert.equal(controlled.codemodDisposition, "SAFE_AUTO");
assert.ok(controlled.tier0ConfidenceScore >= 0.65);

const pricing = classifyMigrationField(
  field({
    fieldKey: "ricambio.prezzo",
    fieldId: "prezzo",
    kind: "number",
    snippet: '<input type="number" id="prezzo" />',
    file: "components/gestionale/magazzino/ricambio-form-fields.tsx",
  }),
);
assert.equal(pricing.tier, 3);
assert.equal(pricing.codemodDisposition, "BLOCKED");

const report = analyzeTier0FalseNegatives();
assert.ok(report.tier0BandAfter >= report.tier0StrictBefore);
assert.ok(typeof report.patternSummary === "object");

console.log("map-tier0-false-negative.test.ts OK");
