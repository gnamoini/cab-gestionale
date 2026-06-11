/**
 * MAP — promotion gate eligibility matrix.
 */
import assert from "node:assert/strict";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import {
  evaluatePromotion,
  generateRolloutConfigPatch,
} from "@/lib/form-ux-migration/form-ux-promotion-gates";

function legacyField(partial: Partial<MigrationInventoryField> & { fieldKey: string; fieldId: string }): MigrationInventoryField {
  return {
    formId: "ricambio",
    file: "components/test.tsx",
    line: 1,
    kind: "text",
    snippet: '<input type="text" />',
    status: "legacy",
    staticallyMigrated: false,
    source: "scan",
    ...partial,
  };
}

const tier0 = legacyField({ fieldKey: "ricambio.label", fieldId: "label" });
const gateA = evaluatePromotion(tier0).find((v) => v.gate === "A");
assert.ok(gateA);
assert.equal(gateA.eligible, true);
assert.ok(gateA.suggestedPatch);

const tier2 = legacyField({
  fieldKey: "ricambio.prezzo",
  fieldId: "prezzo",
  kind: "number",
  snippet: '<input type="number" onBlur={save} />',
});
const gateC = evaluatePromotion(tier2).find((v) => v.gate === "C");
assert.ok(gateC);
assert.equal(gateC.eligible, false);
assert.ok(gateC.blockers.includes("review_not_approved"));

const gateB = evaluatePromotion(tier0).find((v) => v.gate === "B");
assert.ok(gateB);
assert.equal(gateB.eligible, false);
assert.ok(gateB.blockers.includes("no_telemetry_snapshot"));

const patch = generateRolloutConfigPatch([gateA!]);
assert.match(patch, /kind: "text"/);

console.log("map-promotion-gates.test.ts OK");
