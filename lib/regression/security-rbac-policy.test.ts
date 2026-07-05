/**
 * Policy RBAC — page access matrix via data-driven snapshot fixtures.
 */
import assert from "node:assert/strict";
import { canReadPage, canWritePage } from "@/src/lib/rbac/resolve-page-access";
import { clienteRoleRequiresRef, validateClienteRefForRole } from "@/src/lib/auth/cliente-portal-scope";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";

const matrix: Array<{
  role: string;
  dashboardWrite: boolean;
  impostazioniWrite: boolean;
  sicurezzaWrite: boolean;
  lavorazioniClientiRead: boolean;
}> = [
  { role: "admin", dashboardWrite: true, impostazioniWrite: true, sicurezzaWrite: true, lavorazioniClientiRead: true },
  { role: "manager", dashboardWrite: true, impostazioniWrite: true, sicurezzaWrite: false, lavorazioniClientiRead: false },
  { role: "operatore", dashboardWrite: true, impostazioniWrite: false, sicurezzaWrite: false, lavorazioniClientiRead: false },
  { role: "addetto_amministrativo", dashboardWrite: true, impostazioniWrite: false, sicurezzaWrite: false, lavorazioniClientiRead: false },
  { role: "cliente", dashboardWrite: false, impostazioniWrite: false, sicurezzaWrite: false, lavorazioniClientiRead: true },
  { role: "guest", dashboardWrite: false, impostazioniWrite: false, sicurezzaWrite: false, lavorazioniClientiRead: false },
];

for (const row of matrix) {
  const snap = buildTestSnapshot({ userId: `${row.role}-1`, roleKey: row.role });
  const r = snap.resolved;
  assert.equal(canWritePage(r, "dashboard"), row.dashboardWrite, `${row.role} dashboard write`);
  assert.equal(canWritePage(r, "impostazioni"), row.impostazioniWrite, `${row.role} impostazioni write`);
  assert.equal(canWritePage(r, "sicurezza"), row.sicurezzaWrite, `${row.role} sicurezza write`);
  assert.equal(canReadPage(r, "lavorazioni_clienti"), row.lavorazioniClientiRead, `${row.role} client portal`);
}

assert.equal(clienteRoleRequiresRef("cliente"), true);
assert.equal(validateClienteRefForRole("cliente", null) != null, true);

console.log("security-rbac-policy.test.ts OK");
