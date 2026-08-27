/**
 * security_assert_service_role — bypass pg_trigger_depth per catene trigger-internal.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const sql = fs.readFileSync(
  path.join(
    ROOT,
    "supabase/migrations/20261227150000_security_assert_trigger_internal_bypass.sql",
  ),
  "utf8",
);

assert.match(sql, /security_assert_service_role/);
assert.match(sql, /pg_trigger_depth\(\)\s*>\s*0/);
assert.match(sql, /Permesso negato: service_role richiesto/);

console.log("security-assert-trigger-internal-bypass.test.ts OK");
