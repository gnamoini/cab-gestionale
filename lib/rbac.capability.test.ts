import assert from "node:assert/strict";
import { rbacSeedPermissionKeysForRole } from "@/lib/rbac-seed";
import {
  hasResolvedCapability,
  resolveUserPermissions,
} from "@/src/lib/rbac/resolve-user-permissions";

function resolvedFor(roleKey: string) {
  return resolveUserPermissions({
    userId: "test",
    roleKey,
    rolePermissionKeys: rbacSeedPermissionKeysForRole(roleKey),
    userOverrides: [],
  });
}

assert.equal(hasResolvedCapability(resolvedFor("operatore"), "can_manage_settings"), false);
assert.equal(hasResolvedCapability(resolvedFor("manager"), "can_manage_settings"), true);
assert.equal(hasResolvedCapability(resolvedFor("guest"), "can_manage_settings"), false);
assert.equal(hasResolvedCapability(resolvedFor("guest"), "can_read_operational"), true);
assert.equal(hasResolvedCapability(resolvedFor("guest"), "can_write_operational"), false);

console.log("rbac.capability.test.ts OK");
