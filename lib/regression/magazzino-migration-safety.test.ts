import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261021120200_magazzino_stock_integrity.sql"),
  "utf8",
);
const types = fs.readFileSync(path.join(ROOT, "src/types/supabase-tables.ts"), "utf8");
const columns = fs.readFileSync(path.join(ROOT, "lib/db/table-select-columns.ts"), "utf8");

assert.match(migration, /operation_id/);
assert.match(migration, /cap_app_settings_magazzino_master_update/);
assert.match(migration, /magazzino_carichi/);
assert.match(types, /operation_id/);
assert.match(columns, /operation_id/);

console.log("magazzino-migration-safety.test.ts OK");
