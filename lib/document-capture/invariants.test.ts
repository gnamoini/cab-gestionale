import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const adr = path.join(ROOT, "docs/document-capture-architecture.md");
assert.ok(fs.existsSync(adr));
const adrText = fs.readFileSync(adr, "utf8");
for (const inv of ["INV-01", "INV-14", "INV-17", "INV-18", "WIZ-01", "COH-04"]) {
  assert.match(adrText, new RegExp(inv));
}

const migration = path.join(ROOT, "supabase/migrations/20260910151000_document_capture_v41_model.sql");
assert.ok(fs.existsSync(migration));
const sql = fs.readFileSync(migration, "utf8");
assert.match(sql, /document_model jsonb/);
assert.match(sql, /pipeline_state jsonb/);
assert.match(sql, /field_overridden/);

assert.ok(fs.existsSync(path.join(ROOT, "lib/document-capture/orchestrator/types.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/document-capture/rules/dsl.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/document-capture/model/apply-plan-v41.ts")));

console.log("invariants.test.ts OK");
