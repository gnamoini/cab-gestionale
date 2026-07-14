/**
 * Promemoria dashboard: admin e manager possono scrivere/eliminare sulla dashboard.
 */
import assert from "node:assert/strict";
import { canDelete, canWrite } from "@/lib/auth/rbac";
import { RBAC_DENIED_MESSAGE } from "@/lib/rbac";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import type { RequiredRbacContext } from "@/lib/auth/rbac";

function ctx(roleKey: string): RequiredRbacContext {
  return buildTestSnapshot({ userId: `${roleKey}-1`, roleKey }).rbacContext as RequiredRbacContext;
}

for (const role of ["admin", "manager"] as const) {
  assert.equal(canWrite(role, "dashboard", ctx(role)), true, `${role} canWrite dashboard`);
  assert.equal(canDelete(role, "dashboard", ctx(role)), true, `${role} canDelete dashboard`);
}
assert.equal(canWrite("operatore", "dashboard", ctx("operatore")), false);
assert.equal(canWrite("guest", "dashboard", ctx("guest")), false);
assert.equal(canWrite("cliente", "dashboard", ctx("cliente")), false);
assert.equal(RBAC_DENIED_MESSAGE.includes("permessi"), true);
console.log("dashboard-promemoria-rbac.test: OK");
