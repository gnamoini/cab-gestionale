/**
 * Policy RBAC Fase 7 — matrice attesa ruoli × capability (S9 documentato in CI).
 */
import assert from "node:assert/strict";
import { hasCapability } from "@/lib/rbac";
import { clienteRoleRequiresRef, validateClienteRefForRole } from "@/src/lib/auth/cliente-portal-scope";
import { hasPermission } from "@/lib/auth/rbac";

const matrix: Array<{
  role: string;
  manageSettings: boolean;
  manageSecurity: boolean;
  viewClientLavorazioni: boolean;
}> = [
  { role: "admin", manageSettings: true, manageSecurity: true, viewClientLavorazioni: true },
  { role: "manager", manageSettings: true, manageSecurity: false, viewClientLavorazioni: false },
  { role: "operatore", manageSettings: true, manageSecurity: false, viewClientLavorazioni: false },
  { role: "cliente", manageSettings: false, manageSecurity: false, viewClientLavorazioni: true },
  { role: "guest", manageSettings: false, manageSecurity: false, viewClientLavorazioni: false },
];

for (const row of matrix) {
  assert.equal(hasCapability({ ruolo: row.role }, "can_manage_settings"), row.manageSettings, `${row.role} settings`);
  assert.equal(hasCapability({ ruolo: row.role }, "can_manage_security"), row.manageSecurity, `${row.role} security`);
  assert.equal(
    hasPermission(row.role, "viewClientLavorazioni"),
    row.viewClientLavorazioni,
    `${row.role} client portal`,
  );
}

assert.equal(clienteRoleRequiresRef("cliente"), true);
assert.equal(validateClienteRefForRole("cliente", null) != null, true);
assert.equal(validateClienteRefForRole("cliente", "ACME"), null);
assert.equal(validateClienteRefForRole("admin", null), null);

console.log("security-rbac-policy.test.ts OK");
