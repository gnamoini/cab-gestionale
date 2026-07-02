import assert from "node:assert/strict";
import { rbacSeedPermissionKeysForRole } from "@/lib/rbac-seed";
import { buildEffectivePermissionsByModule } from "@/src/lib/permissions/effective-permissions";
import type { UserPermissionRow } from "@/src/types/supabase-tables";

const operatoreKeys = rbacSeedPermissionKeysForRole("operatore");

const baseOperatore = buildEffectivePermissionsByModule({
  userId: "u1",
  roleKey: "operatore",
  rolePermissionKeys: operatoreKeys,
});
assert.equal(baseOperatore.magazzino.canWrite, true);
assert.equal(baseOperatore.lavorazioni.canWrite, true);

const restricted = buildEffectivePermissionsByModule({
  userId: "u1",
  roleKey: "operatore",
  rolePermissionKeys: operatoreKeys,
  permissionRows: [
    {
      user_id: "u1",
      permission_id: "p1",
      effect: "deny",
      permissions: { key: "magazzino.write", module: "magazzino", action: "write" },
    } as UserPermissionRow,
  ],
});
assert.equal(restricted.magazzino.canWrite, false);
assert.equal(restricted.magazzino.canRead, true);
assert.equal(restricted.lavorazioni.canWrite, true);

const operatoreDenyRead = buildEffectivePermissionsByModule({
  userId: "u1",
  roleKey: "operatore",
  rolePermissionKeys: operatoreKeys,
  permissionRows: [
    {
      user_id: "u1",
      permission_id: "p2",
      effect: "deny",
      permissions: { key: "lavorazioni.read", module: "lavorazioni", action: "read" },
    } as UserPermissionRow,
  ],
});
assert.equal(operatoreDenyRead.lavorazioni.canRead, false);
assert.equal(operatoreDenyRead.lavorazioni.canWrite, true);

console.log("effective-permissions.test.ts OK");
