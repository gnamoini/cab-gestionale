import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const sql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260902130800_document_capture_apply_lock.sql"),
  "utf8",
);

assert.match(sql, /applying/);
assert.match(sql, /document_capture_begin_apply/);
assert.match(sql, /document_capture_complete_apply/);
assert.match(sql, /document_capture_abort_apply/);
assert.match(sql, /for update/i);

const rateSql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260902130900_document_capture_rate_limit.sql"),
  "utf8",
);
assert.match(rateSql, /document_capture_rate_limit_check/);

const rlsSql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260902131200_document_capture_rls_events_audit.sql"),
  "utf8",
);
assert.match(rlsSql, /storage_uploaded/);
assert.match(rlsSql, /archived/);

const finalizeSelectSql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260910150900_document_capture_finalize_storage_select.sql"),
  "utf8",
);
assert.match(finalizeSelectSql, /pending_upload/);
assert.match(finalizeSelectSql, /uploaded_by = v_uid/);
assert.match(finalizeSelectSql, /deleted_at is null/);
assert.match(finalizeSelectSql, /finalized_at is null/);

console.log("document-capture-rls-audit.test.ts OK");
