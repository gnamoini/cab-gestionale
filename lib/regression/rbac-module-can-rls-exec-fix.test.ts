/**
 * rbac_module_can RLS exec fix — plpgsql DEFINER (non sql) per policy RLS.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const sql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20261227143000_rbac_module_can_rls_exec_fix.sql"),
  "utf8",
);

assert.match(sql, /language plpgsql[\s\S]*rbac_module_can/);
assert.match(sql, /rbac_auth_uid\(\)/);
assert.match(sql, /lower\(trim\(public\.rbac_role_for_user/);
assert.doesNotMatch(sql, /language sql[\s\S]*rbac_module_can/);

console.log("rbac-module-can-rls-exec-fix.test.ts OK");
