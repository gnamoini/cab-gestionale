/**
 * Portal data isolation: operative history policies exclude cliente role.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const migration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261226120300_security_rls_operative_history_p0.sql"),
  "utf8",
);

for (const table of ["operative_history_cases", "operative_history_signals", "tkb_draft_store"]) {
  assert.match(
    migration,
    new RegExp(`on public\\.${table}[\\s\\S]*?not public\\.rbac_is_cliente\\(\\)`, "i"),
    `${table} policy must include NOT rbac_is_cliente()`,
  );
}

assert.match(migration, /tkb_published_snapshots[\s\S]*?not public\.rbac_is_cliente\(\)/i);

console.log("security-portal-data-isolation.test: OK");
