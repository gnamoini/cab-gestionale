import assert from "node:assert/strict";
import { resolveUserPermissions } from "@/src/lib/rbac/resolve-user-permissions";
import { rbacSeedPermissionKeysForRole } from "@/lib/rbac-seed";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";

// deny > allow > role
const operatore = resolveUserPermissions({
  userId: "op-1",
  roleKey: "operatore",
  rolePermissionKeys: rbacSeedPermissionKeysForRole("operatore"),
  userOverrides: [{ permissionKey: "preventivi.read", effect: "deny" }],
});
assert.equal(operatore.modules.preventivi.canRead, false);

const overrideAllow = resolveUserPermissions({
  userId: "op-2",
  roleKey: "operatore",
  rolePermissionKeys: rbacSeedPermissionKeysForRole("operatore"),
  userOverrides: [{ permissionKey: "preventivi.read", effect: "allow" }],
});
assert.equal(overrideAllow.modules.preventivi.canRead, true);

// admin bypass
const admin = buildTestSnapshot({ userId: "a1", roleKey: "admin" });
assert.equal(admin.modules.magazzino.canWrite, true);
assert.equal(admin.resolved.capabilities.can_manage_security, true);

// guest read-only
const guest = buildTestSnapshot({ userId: "g1", roleKey: "guest" });
assert.equal(guest.modules.magazzino.canRead, true);
assert.equal(guest.modules.magazzino.canWrite, false);

// missing role perms → fail-closed
const empty = resolveUserPermissions({
  userId: "x",
  roleKey: "operatore",
  rolePermissionKeys: [],
  userOverrides: [],
});
assert.equal(empty.modules.magazzino.canRead, false);

console.log("rbac-data-driven-resolver.test.ts OK");
