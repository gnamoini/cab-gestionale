/**
 * Policy RBAC — capability matrix via data-driven snapshot fixtures.
 */
import assert from "node:assert/strict";
import { hasResolvedCapability } from "@/src/lib/rbac/resolve-user-permissions";
import { clienteRoleRequiresRef, validateClienteRefForRole } from "@/src/lib/auth/cliente-portal-scope";
import { hasPermission } from "@/lib/auth/rbac";
import type { RequiredRbacContext } from "@/lib/rbac";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";

const matrix: Array<{
  role: string;
  readOp: boolean;
  writeOp: boolean;
  manageSettings: boolean;
  manageSecurity: boolean;
  viewClientLavorazioni: boolean;
}> = [
  { role: "admin", readOp: true, writeOp: true, manageSettings: true, manageSecurity: true, viewClientLavorazioni: true },
  { role: "manager", readOp: true, writeOp: true, manageSettings: true, manageSecurity: false, viewClientLavorazioni: false },
  { role: "operatore", readOp: true, writeOp: true, manageSettings: false, manageSecurity: false, viewClientLavorazioni: false },
  { role: "addetto_amministrativo", readOp: true, writeOp: true, manageSettings: false, manageSecurity: false, viewClientLavorazioni: false },
  { role: "cliente", readOp: false, writeOp: false, manageSettings: false, manageSecurity: false, viewClientLavorazioni: true },
  { role: "guest", readOp: true, writeOp: false, manageSettings: false, manageSecurity: false, viewClientLavorazioni: false },
];

for (const row of matrix) {
  const snap = buildTestSnapshot({ userId: `${row.role}-1`, roleKey: row.role });
  const r = snap.resolved;
  assert.equal(hasResolvedCapability(r, "can_read_operational"), row.readOp, `${row.role} readOp`);
  assert.equal(hasResolvedCapability(r, "can_write_operational"), row.writeOp, `${row.role} writeOp`);
  assert.equal(hasResolvedCapability(r, "can_manage_settings"), row.manageSettings, `${row.role} settings`);
  assert.equal(hasResolvedCapability(r, "can_manage_security"), row.manageSecurity, `${row.role} security`);
  assert.equal(
    hasPermission(row.role, "viewClientLavorazioni", snap.rbacContext as RequiredRbacContext),
    row.viewClientLavorazioni,
    `${row.role} client portal`,
  );
}

assert.equal(clienteRoleRequiresRef("cliente"), true);
assert.equal(validateClienteRefForRole("cliente", null) != null, true);

console.log("security-rbac-policy.test.ts OK");
