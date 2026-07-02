/**
 * RBAC seed parity — contratto matrice seed (non runtime).
 */
import assert from "node:assert/strict";
import { rbacSeedPermissionKeysForRole } from "@/lib/rbac-seed";
import { resolveCanonicalRole } from "@/lib/rbac";
import { GESTIONALE_PERMISSION_MODULES } from "@/src/lib/permissions/gestionale-modules";
import { canReadModule, canWriteModule, resolveUserPermissions } from "@/src/lib/rbac/resolve-user-permissions";

const ERP_MODULES = GESTIONALE_PERMISSION_MODULES;

function expectModule(
  role: string,
  module: (typeof ERP_MODULES)[number],
  op: "read" | "write",
  expected: boolean,
) {
  const canonical = resolveCanonicalRole(role);
  const resolved = resolveUserPermissions({
    userId: "test",
    roleKey: canonical,
    rolePermissionKeys: rbacSeedPermissionKeysForRole(canonical),
    userOverrides: [],
  });
  const actual = op === "read" ? canReadModule(resolved, module) : canWriteModule(resolved, module);
  assert.equal(actual, expected, `${role} ${module} ${op}`);
}

for (const m of ["magazzino", "lavorazioni", "mezzi", "documenti"] as const) {
  expectModule("operatore", m, "read", true);
  expectModule("operatore", m, "write", true);
}
for (const m of ["preventivi", "fatturazione", "ddt", "ordini_fornitori", "report", "dipendenti"] as const) {
  expectModule("operatore", m, "read", false);
  expectModule("operatore", m, "write", false);
}

for (const m of ["preventivi", "fatturazione", "ddt", "ordini_fornitori", "report"] as const) {
  expectModule("addetto_amministrativo", m, "read", true);
  expectModule("addetto_amministrativo", m, "write", true);
}
expectModule("addetto_amministrativo", "magazzino", "read", false);

for (const m of ERP_MODULES) {
  expectModule("guest", m, "read", true);
  expectModule("guest", m, "write", false);
}

for (const m of ERP_MODULES) {
  const resolved = resolveUserPermissions({
    userId: "test",
    roleKey: "manager",
    rolePermissionKeys: rbacSeedPermissionKeysForRole("manager"),
    userOverrides: [],
  });
  assert.equal(canReadModule(resolved, m), true, `manager ${m} read`);
  assert.equal(canWriteModule(resolved, m), true, `manager ${m} write`);
}

const operatoreOverride = resolveUserPermissions({
  userId: "test",
  roleKey: "operatore",
  rolePermissionKeys: rbacSeedPermissionKeysForRole("operatore"),
  userOverrides: [{ permissionKey: "preventivi.read", effect: "allow" }],
});
assert.equal(canReadModule(operatoreOverride, "preventivi"), true);
assert.equal(canWriteModule(operatoreOverride, "preventivi"), false);

assert.equal(resolveCanonicalRole("commerciale"), "addetto_amministrativo");

console.log("role-module-parity.test.ts OK");
