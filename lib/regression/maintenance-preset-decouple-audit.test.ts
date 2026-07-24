import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const migration = read("supabase/migrations/20261024120000_maintenance_preset_decouple.sql");
const auditSql = read("scripts/audit-maintenance-preset-decouple.sql");
const upsertPlan = read("src/services/maintenance-plans.service.ts");
const engineV2 = read("src/services/maintenance-engine-v2.service.ts");

assert.match(migration, /maintenance_plan_equipment_types/i);
assert.match(auditSql, /vehicle_maintenance_configs/i);
assert.match(upsertPlan, /maintenance_kind:\s*null/);
assert.doesNotMatch(engineV2, /ensureMezzoConfigsFromLegacy/);
assert.doesNotMatch(engineV2, /resolvePlansForMezzo/);

console.log("maintenance-preset-decouple-audit.test.ts OK");
