import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const core = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260915120000_maintenance_plans_core.sql"),
  "utf8",
);
const rls = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260915120100_maintenance_plans_rls.sql"),
  "utf8",
);
const alwaysOn = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260915120300_maintenance_plans_v1_always_on.sql"),
  "utf8",
);

assert.match(core, /tipi_attrezzatura_catalog/);
assert.match(core, /maintenance_plans/);
assert.match(core, /maintenance_plan_equipment_types/);
assert.match(core, /vehicle_maintenance_services/);
assert.match(core, /performed_by/);
assert.match(core, /mezzo_ore_snapshot/);
assert.match(core, /maintenance_plans_v1/);

assert.match(rls, /cap_mplan_select/);
assert.match(rls, /cap_vms_insert/);
assert.match(rls, /vehicle_maintenance_services/);
assert.match(rls, /rbac_maintenance_plans_settings_write/);

assert.match(alwaysOn, /DELETE FROM public\.app_settings/);
assert.match(alwaysOn, /maintenance_plans_v1/);
assert.match(alwaysOn, /SELECT true/);

const matrixDelete = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260915120400_maintenance_matrix_delete_write.sql"),
  "utf8",
);
assert.match(matrixDelete, /cap_vms_delete/);
assert.match(matrixDelete, /mezzi', 'write'/);

console.log("maintenance-plans-rls.test.ts OK");
