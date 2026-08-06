/**
 * Supabase linter 0013: internal public tables must have RLS + explicit client revokes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261111130000_security_advisor_linter_hardening.sql"),
  "utf8",
);

const internalTables = [
  "audit_note_ssot_conflicts",
  "attrezzature_dedup_report",
  "mezzi_dedup_report",
  "notification_templates",
  "search_document_rebuild_queue",
] as const;

for (const table of internalTables) {
  assert.match(
    migration,
    new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, "i"),
    `${table} must enable row level security`,
  );
  assert.match(
    migration,
    new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM PUBLIC`, "i"),
    `${table} must revoke from PUBLIC`,
  );
  assert.match(
    migration,
    new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM anon`, "i"),
    `${table} must revoke from anon`,
  );
  assert.match(
    migration,
    new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM authenticated`, "i"),
    `${table} must revoke from authenticated`,
  );
}

assert.match(
  migration,
  /security_invoker=true/i,
  "migration must verify security_invoker on public views",
);
assert.match(
  migration,
  /has_table_privilege/i,
  "migration must verify client table privileges are revoked",
);

console.log("security-advisor-linter-hardening.test: OK");
