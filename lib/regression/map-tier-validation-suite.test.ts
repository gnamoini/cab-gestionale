/**
 * MAP validation suite — hard rules block pricing and cross-field sync.
 */
import assert from "node:assert/strict";
import { classifyMigrationField } from "@/lib/form-ux-migration/form-ux-migration-classifier";
import type { MigrationInventoryField } from "@/lib/form-ux-migration/form-ux-migration-inventory-core";
import { validateRecalibratedCandidates } from "@/lib/form-ux-migration/form-ux-tier-validation-suite";

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

const safeField = field({ fieldKey: "settings.label", fieldId: "label", formId: "settings" });
const safeProfile = classifyMigrationField(safeField);
const safeResult = validateRecalibratedCandidates([{ field: safeField, profile: safeProfile }]);
assert.equal(safeResult.passed, true);

const priceField = field({
  fieldKey: "ricambio.prezzo",
  fieldId: "prezzo",
  kind: "number",
  snippet: '<input type="number" id="prezzo" />',
});
const priceProfile = classifyMigrationField(priceField);
const priceResult = validateRecalibratedCandidates([{ field: priceField, profile: priceProfile }]);
assert.equal(priceResult.passed, false);
assert.ok(priceResult.violations.some((v) => v.rule === "no_pricing_keywords"));

const syncField = field({
  fieldKey: "ricambio.sync",
  fieldId: "sync",
  snippet: "useEffect(() => { setOther(x); }, [x])",
});
const syncProfile = classifyMigrationField(syncField);
const syncResult = validateRecalibratedCandidates([{ field: syncField, profile: syncProfile }]);
assert.equal(syncResult.passed, false);
assert.ok(syncResult.violations.some((v) => v.rule.startsWith("hard_signal_")));

console.log("map-tier-validation-suite.test.ts OK");
