import assert from "node:assert/strict";
import { buildEffectivePermissionsByModule } from "@/src/lib/permissions/effective-permissions";

const baseOperatore = buildEffectivePermissionsByModule("operatore", undefined);
assert.equal(baseOperatore.magazzino.canWrite, true);
assert.equal(baseOperatore.lavorazioni.canWrite, true);

const restricted = buildEffectivePermissionsByModule("operatore", [
  {
    user_id: "u1",
    module: "magazzino",
    can_read: true,
    can_write: false,
    can_admin: false,
  },
]);
assert.equal(restricted.magazzino.canWrite, false);
assert.equal(restricted.magazzino.canRead, true);
assert.equal(restricted.lavorazioni.canWrite, true);

const adminOverride = buildEffectivePermissionsByModule("admin", [
  {
    user_id: "u1",
    module: "lavorazioni",
    can_read: false,
    can_write: false,
    can_admin: false,
  },
]);
assert.equal(adminOverride.lavorazioni.canRead, false);
assert.equal(adminOverride.lavorazioni.canWrite, false);

console.log("effective-permissions.test.ts OK");
