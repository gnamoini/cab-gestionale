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
  lavorazioniWrite: boolean;
  lavorazioniClientiRead: boolean;
  ordiniFornitoriWrite: boolean;
  ordiniFornitoriRead: boolean;
}> = [
  { role: "admin", dashboardWrite: true, impostazioniWrite: true, sicurezzaWrite: true, lavorazioniWrite: true, lavorazioniClientiRead: true, ordiniFornitoriWrite: true, ordiniFornitoriRead: true },
  { role: "manager", dashboardWrite: true, impostazioniWrite: true, sicurezzaWrite: false, lavorazioniWrite: true, lavorazioniClientiRead: false, ordiniFornitoriWrite: true, ordiniFornitoriRead: true },
  { role: "operatore", dashboardWrite: false, impostazioniWrite: false, sicurezzaWrite: false, lavorazioniWrite: true, lavorazioniClientiRead: false, ordiniFornitoriWrite: false, ordiniFornitoriRead: false },
  { role: "addetto_amministrativo", dashboardWrite: true, impostazioniWrite: false, sicurezzaWrite: false, lavorazioniWrite: false, lavorazioniClientiRead: false, ordiniFornitoriWrite: true, ordiniFornitoriRead: true },
  { role: "cliente", dashboardWrite: false, impostazioniWrite: false, sicurezzaWrite: false, lavorazioniWrite: false, lavorazioniClientiRead: true, ordiniFornitoriWrite: false, ordiniFornitoriRead: false },
  { role: "guest", dashboardWrite: false, impostazioniWrite: false, sicurezzaWrite: false, lavorazioniWrite: false, lavorazioniClientiRead: false, ordiniFornitoriWrite: false, ordiniFornitoriRead: true },
];

for (const row of matrix) {
  const snap = buildTestSnapshot({ userId: `${row.role}-1`, roleKey: row.role });
  const r = snap.resolved;
  assert.equal(canWritePage(r, "dashboard"), row.dashboardWrite, `${row.role} dashboard write`);
  assert.equal(canWritePage(r, "impostazioni"), row.impostazioniWrite, `${row.role} impostazioni write`);
  assert.equal(canWritePage(r, "sicurezza"), row.sicurezzaWrite, `${row.role} sicurezza write`);
  assert.equal(canWritePage(r, "lavorazioni"), row.lavorazioniWrite, `${row.role} lavorazioni write`);
  assert.equal(canReadPage(r, "lavorazioni_clienti"), row.lavorazioniClientiRead, `${row.role} client portal`);
  assert.equal(canWritePage(r, "ordini_fornitori"), row.ordiniFornitoriWrite, `${row.role} ordini fornitori write`);
  assert.equal(canReadPage(r, "ordini_fornitori"), row.ordiniFornitoriRead, `${row.role} ordini fornitori read`);
}

assert.equal(clienteRoleRequiresRef("cliente"), true);
assert.equal(validateClienteRefForRole("cliente", null) != null, true);

console.log("security-rbac-policy.test.ts OK");
