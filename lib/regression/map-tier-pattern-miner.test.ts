/**
 * MAP pattern miner — wrapper/HOC/hook frequency on fixtures.
 */
import assert from "node:assert/strict";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import {
  detectFieldPatterns,
  mineTierPatterns,
} from "@/lib/form-ux-migration/form-ux-tier-pattern-miner";

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

const controlledPatterns = detectFieldPatterns(
  field({
    fieldKey: "ricambio.a",
    fieldId: "a",
    snippet: '<input type="text" onChange={setA} required />',
  }),
);
assert.ok(controlledPatterns.includes("onChange_controlled"));
assert.ok(controlledPatterns.includes("validation_ui_only"));

const migratedPatterns = detectFieldPatterns(
  field({
    fieldKey: "ricambio.b",
    fieldId: "b",
    snippet: "<MigratedTextInput value={x} onChange={setX} />",
  }),
);
assert.ok(migratedPatterns.includes("MigratedTextInput"));

const stats = mineTierPatterns([
  field({
    fieldKey: "ricambio.c",
    fieldId: "c",
    snippet: '<input type="text" onChange={setC} />',
  }),
  field({
    fieldKey: "ricambio.d",
    fieldId: "d",
    snippet: '<input type="text" onChange={setD} />',
  }),
]);
const onChangeStat = stats.find((s) => s.pattern === "onChange_controlled");
assert.ok(onChangeStat);
assert.equal(onChangeStat!.frequency, 2);
assert.equal(onChangeStat!.safeBias, "safe");

console.log("map-tier-pattern-miner.test.ts OK");
