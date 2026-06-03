/**
 * Promemoria dashboard: admin e operatore possono scrivere/eliminare (capability operativa).
 */
import assert from "node:assert/strict";
import { canDelete, canWrite } from "@/lib/auth/rbac";
import { RBAC_DENIED_MESSAGE } from "@/lib/rbac";

function main(): void {
  for (const role of ["admin", "manager", "operatore"] as const) {
    assert.equal(canWrite(role, "dashboard"), true, `${role} canWrite dashboard`);
    assert.equal(canDelete(role, "dashboard"), true, `${role} canDelete dashboard`);
  }
  assert.equal(canWrite("guest", "dashboard"), false);
  assert.equal(canWrite("cliente", "dashboard"), false);
  assert.equal(RBAC_DENIED_MESSAGE.includes("permessi"), true);
  console.log("dashboard-promemoria-rbac.test: OK");
}

main();
