/**
 * Matrice RBAC write path agenda — seed SSOT vs canWritePage.
 */
import assert from "node:assert/strict";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import { canWritePage } from "@/src/lib/rbac/resolve-page-access";

type AgendaWriteRow = {
  role: string;
  agendaWrite: boolean;
};

const matrix: AgendaWriteRow[] = [
  { role: "admin", agendaWrite: true },
  { role: "manager", agendaWrite: true },
  { role: "operatore", agendaWrite: true },
  { role: "addetto_amministrativo", agendaWrite: true },
  { role: "guest", agendaWrite: false },
  { role: "cliente", agendaWrite: false },
];

for (const row of matrix) {
  const snap = buildTestSnapshot({ userId: `agenda-${row.role}`, roleKey: row.role });
  assert.equal(canWritePage(snap.resolved, "agenda"), row.agendaWrite, `${row.role} agenda write`);
}

const denied = buildTestSnapshot({
  userId: "mgr-deny-agenda",
  roleKey: "manager",
  userPageOverrides: [{ page_key: "agenda", access_level: "none" }],
});
assert.equal(canWritePage(denied.resolved, "agenda"), false, "manager override agenda none");

console.log("agenda-write-path-rbac-matrix.test.ts OK");
