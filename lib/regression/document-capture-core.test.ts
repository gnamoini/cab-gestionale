import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const migrationCore = path.join(ROOT, "supabase/migrations/20260902130000_document_capture_core.sql");
const migrationPerm = path.join(ROOT, "supabase/migrations/20260902130100_user_permissions_document_capture.sql");

assert.ok(fs.existsSync(migrationCore));
assert.ok(fs.existsSync(migrationPerm));

const sql = fs.readFileSync(migrationCore, "utf8");
assert.match(sql, /document_capture_events/);
assert.match(sql, /idempotency_key/);
assert.match(sql, /unique \(document_capture_id, idempotency_key\)/i);
assert.match(sql, /expire_pending_document_captures/);
assert.match(sql, /document_capture_finalize/);
assert.match(sql, /storage_version/);
assert.match(sql, /capture_version/);
assert.match(sql, /expiration/);
assert.match(sql, /document-capture/);
assert.match(sql, /rbac_user_company_id/);

const v41Migration = path.join(ROOT, "supabase/migrations/20260910151000_document_capture_v41_model.sql");
assert.ok(fs.existsSync(v41Migration));
const v41Sql = fs.readFileSync(v41Migration, "utf8");
assert.match(v41Sql, /document_model jsonb/);
assert.match(v41Sql, /pipeline_state jsonb/);

const permSql = fs.readFileSync(migrationPerm, "utf8");
assert.match(permSql, /document_capture/);

const rbacSeed = fs.readFileSync(path.join(ROOT, "lib/rbac-seed.ts"), "utf8");
assert.match(rbacSeed, /document_capture/);

const modules = fs.readFileSync(path.join(ROOT, "src/lib/permissions/gestionale-modules.ts"), "utf8");
assert.match(modules, /document_capture/);

assert.ok(fs.existsSync(path.join(ROOT, "app/api/document-capture/upload-policy/route.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "app/api/document-capture/[id]/finalize/route.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/document-capture/sanitize-capture-filename.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "components/document-capture/lavorazioni-capture-drop-overlay.tsx")));

const applyLock = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260902130800_document_capture_apply_lock.sql"),
  "utf8",
);
assert.match(applyLock, /'applying'/);
assert.match(applyLock, /document_capture_begin_apply/);
assert.match(applyLock, /document_capture_complete_apply/);
assert.match(applyLock, /document_capture_abort_apply/);

const lavToolbar = fs.readFileSync(
  path.join(ROOT, "components/gestionale/lavorazioni/lavorazioni-page-toolbar.tsx"),
  "utf8",
);
assert.match(lavToolbar, /LavorazioniDigitalCaptureLauncher/);

console.log("document-capture-core.test.ts OK");
