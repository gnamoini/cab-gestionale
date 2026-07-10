import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910180000_import_export_prg_v12.sql"),
  "utf8",
);
assert.match(migration, /created_by, entity, fingerprint_hash, import_mode/);

const batchStore = fs.readFileSync(path.join(ROOT, "lib/data-import/core/batch-store.server.ts"), "utf8");
assert.match(batchStore, /findSuccessfulFingerprintDuplicate/);
assert.match(batchStore, /import_mode/);

console.log("import-export-prg/concurrency.test.ts OK");
