import assert from "node:assert/strict";
import {
  isPresetAssignable,
  MAINTENANCE_EQUIPMENT_JUNCTION_TABLE,
  MAINTENANCE_INTERVAL_SSOT_TABLES,
} from "@/lib/maintenance-plans/maintenance-domain-contract";
import { planDraftToUpsertInput, emptyPlanDraft } from "@/lib/maintenance-plans/preset-editor-draft";

assert.deepEqual(MAINTENANCE_INTERVAL_SSOT_TABLES, [
  "maintenance_preset_trigger_groups",
  "maintenance_preset_triggers",
]);
assert.equal(MAINTENANCE_EQUIPMENT_JUNCTION_TABLE, "maintenance_plan_equipment_types");
assert.equal(isPresetAssignable("active"), true);
assert.equal(isPresetAssignable("archived"), false);

const draft = emptyPlanDraft();
const upsert = planDraftToUpsertInput({ ...draft, nome: "Test preset" });
assert.equal(upsert.nome, "Test preset");
assert.equal(upsert.maintenanceKind, "tagliando_ore");
assert.equal("tipoAttrezzaturaIds" in upsert, false);

const kmDraft = planDraftToUpsertInput({
  ...draft,
  nome: "Km preset",
  triggersDraft: [{ triggerType: "km", threshold: 25000, priority: 0 }],
});
assert.equal(kmDraft.maintenanceKind, "tagliando_km");
assert.ok(kmDraft.maintenanceKind != null);
assert.equal("checklist" in kmDraft, false);

console.log("maintenance-preset-decouple.test.ts OK");
