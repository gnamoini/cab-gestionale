import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_MIGRATIONS = [
  "supabase/migrations/20260718120000_data_import_infrastructure.sql",
  "supabase/migrations/20260910170000_import_export_framework_v3.sql",
  "supabase/migrations/20260910180000_import_export_prg_v12.sql",
];

for (const rel of REQUIRED_MIGRATIONS) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing migration ${rel}`);
}

const prg = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910180000_import_export_prg_v12.sql"),
  "utf8",
);
assert.match(prg, /import_batch_entities/);
assert.match(prg, /import_batches_fingerprint_success_uidx/);
assert.match(prg, /entity,\s*fingerprint_hash,\s*import_mode/);
assert.match(prg, /import_export_telemetry_daily/);

const apiRoutes = [
  "app/api/import/[entity]/parse/route.ts",
  "app/api/import/[entity]/execute/route.ts",
  "app/api/export/[entity]/route.ts",
];
for (const rel of apiRoutes) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing route ${rel}`);
}

console.log("import-export-migration-gate.test.ts OK");
