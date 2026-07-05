import assert from "node:assert/strict";
import { resolvePageAccess } from "@/src/lib/rbac/resolve-page-access";
import { seedPageAccessForRole } from "@/lib/rbac-page-seed";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";

// deny override > role default
const operatore = resolvePageAccess({
  userId: "op-1",
  roleKey: "operatore",
  rolePageAccess: seedPageAccessForRole("operatore"),
  userPageOverrides: { preventivi: "none" },
});
assert.equal(operatore.modules.preventivi.canRead, false);

const overrideAllow = resolvePageAccess({
  userId: "op-2",
  roleKey: "operatore",
  rolePageAccess: seedPageAccessForRole("operatore"),
  userPageOverrides: { preventivi: "read" },
});
assert.equal(overrideAllow.modules.preventivi.canRead, true);

// admin bypass
const admin = buildTestSnapshot({ userId: "a1", roleKey: "admin" });
assert.equal(admin.modules.magazzino.canWrite, true);
assert.equal(admin.resolved.pages.sicurezza.canWrite, true);

// guest read-only
const guest = buildTestSnapshot({ userId: "g1", roleKey: "guest" });
assert.equal(guest.modules.magazzino.canRead, true);
assert.equal(guest.modules.magazzino.canWrite, false);

// missing role perms → fail-closed
const empty = resolvePageAccess({
  userId: "x",
  roleKey: "operatore",
  rolePageAccess: {},
  userPageOverrides: {},
});
assert.equal(empty.modules.magazzino.canRead, false);

console.log("rbac-data-driven-resolver.test.ts OK");
