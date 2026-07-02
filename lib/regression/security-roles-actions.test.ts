import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const migration = readFileSync(
  join(root, "supabase/migrations/20260903120000_rbac_data_driven_core.sql"),
  "utf8",
);
const actions = readFileSync(join(root, "src/actions/security-roles-permissions.ts"), "utf8");

assert.match(migration, /create table if not exists public\.roles/);
assert.match(migration, /rbac_user_effective_permission/);
assert.match(migration, /security_set_user_role\(\s*p_user_id uuid,\s*p_role_key text/);
assert.match(actions, /createRoleAction/);
assert.match(actions, /updateRolePermissionsAction/);
assert.match(actions, /is_system/);

console.log("security-roles-actions.test.ts OK");
