import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const recovery = fs.readFileSync(
  path.join(ROOT, "lib/data-import/core/import-recovery.server.ts"),
  "utf8",
);
assert.match(recovery, /listImportBatchEntityIds/);
assert.match(recovery, /running/);

const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910180000_import_export_prg_v12.sql"),
  "utf8",
);
assert.match(migration, /import_batch_entities/);

console.log("import-export-prg/recovery.test.ts OK");
