import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const core = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261020120000_maintenance_engine_v2_core.sql"),
  "utf8",
);
const rls = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261020120100_maintenance_engine_v2_rls.sql"),
  "utf8",
);
const backfill = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261021120000_maintenance_engine_v2_backfill.sql"),
  "utf8",
);
const rpc = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261021120100_register_maintenance_execution_v2_rpc.sql"),
  "utf8",
);
const entry = fs.readFileSync(
  path.join(process.cwd(), "lib/domain/maintenance-plans-entry.ts"),
  "utf8",
);

assert.match(core, /vehicle_maintenance_configs/);
assert.match(core, /maintenance_preset_versions/);
assert.match(core, /vehicle_maintenance_forecast_history/);
assert.match(core, /maintenance_replacement_condition/);
assert.match(core, /uq_vmc_mezzo_preset_active/);
assert.match(core, /uq_vmc_mezzo_kind_custom/);

assert.match(rls, /cap_vmc_select/);
assert.match(rls, /vehicle_maintenance_configs/);
assert.match(rls, /tagliando_previsto_7g/);

assert.match(backfill, /vehicle_maintenance_configs/);
assert.match(backfill, /config_id/);
assert.doesNotMatch(backfill, /DROP TABLE/i);

assert.match(rpc, /register_maintenance_execution_v2/);
assert.match(rpc, /rbac_can_write\('mezzi'\)/);

assert.match(entry, /recomputeForecast: withPageWriteGuard\("mezzi"/);
assert.match(entry, /registerExecutionV2: withPageWriteGuard\("mezzi"/);
assert.match(entry, /upsertMezzoConfig: withPageWriteGuard\("mezzi"/);

console.log("maintenance-engine-v2-rls.test.ts OK");
