/**
 * Supabase linter follow-up migration (0010/0013/0011/0024/0028).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20270316120000_security_advisor_linter_followup.sql"),
  "utf8",
);

const internalTables = [
  "accounting_entry_balance_pending",
  "admin_billing_customer_migration_map",
] as const;

for (const table of internalTables) {
  assert.match(
    migration,
    new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, "i"),
    `${table} must enable row level security`,
  );
  assert.match(
    migration,
    new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM authenticated`, "i"),
    `${table} must revoke from authenticated`,
  );
}

assert.match(migration, /v_invoice_sdi_submissions_legacy[\s\S]*security_invoker\s*=\s*true/i);
assert.match(migration, /alter function public\.%I\(%s\) set search_path = public/i);
assert.match(migration, /revoke all on function public\.%I\(%s\) from anon/i);
assert.match(migration, /rbac_is_operatore_or_admin\(\)/i);
assert.match(migration, /has_function_privilege\('anon'/i);

console.log("security-advisor-linter-followup.test: OK");
