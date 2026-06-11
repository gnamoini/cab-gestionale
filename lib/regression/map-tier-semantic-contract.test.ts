/**
 * MAP Tier 0B semantic contract — invariant fixtures.
 */
import assert from "node:assert/strict";
import { classifyMigrationField } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import {
  evaluateTier0BContract,
  isTier0BContractSatisfied,
  Tier0BContract,
} from "@/lib/form-ux-migration/form-ux-tier-semantic-contract";

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

assert.equal(Tier0BContract.invariants.length, 4);

const safeField = field({ fieldKey: "ricambio.notes", fieldId: "notes" });
const safeProfile = classifyMigrationField(safeField);
const safeContract = evaluateTier0BContract(safeField, safeProfile);
assert.equal(safeContract.passed, true);
assert.equal(isTier0BContractSatisfied(safeField, safeProfile), true);

const syncField = field({
  fieldKey: "ricambio.sync",
  fieldId: "sync",
  snippet: "useEffect(() => { setOther(x); }, [x])",
});
const syncProfile = classifyMigrationField(syncField);
const syncContract = evaluateTier0BContract(syncField, syncProfile);
assert.equal(syncContract.passed, false);
assert.ok(syncContract.violations.some((v) => v.invariant === "no_cross_field_state"));

const storeField = field({
  fieldKey: "ricambio.ext",
  fieldId: "ext",
  snippet: "const x = useStore(s => s.value)",
});
const storeProfile = classifyMigrationField(storeField);
const storeContract = evaluateTier0BContract(storeField, storeProfile);
assert.equal(storeContract.passed, false);
assert.ok(storeContract.violations.some((v) => v.invariant === "no_async_external_store"));

console.log("map-tier-semantic-contract.test.ts OK");
