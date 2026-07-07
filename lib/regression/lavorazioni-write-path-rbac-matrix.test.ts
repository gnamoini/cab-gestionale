/**
 * Matrice RBAC write path lavorazioni — tutti i ruoli canonici vs seed SSOT.
 */
import assert from "node:assert/strict";
import { seedPageAccessForRole } from "@/lib/rbac-page-seed";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import { evaluateGestionaleRouteAccess } from "@/src/lib/auth/evaluate-gestionale-route-access";
import { canReadPage, canWritePage } from "@/src/lib/rbac/resolve-page-access";

type LavWriteRow = {
  role: string;
  lavorazioniWrite: boolean;
  mezziWrite: boolean;
  routeLavorazioni: boolean;
};

const matrix: LavWriteRow[] = [
  { role: "admin", lavorazioniWrite: true, mezziWrite: true, routeLavorazioni: true },
  { role: "manager", lavorazioniWrite: true, mezziWrite: true, routeLavorazioni: true },
  { role: "operatore", lavorazioniWrite: true, mezziWrite: true, routeLavorazioni: true },
  { role: "addetto_amministrativo", lavorazioniWrite: false, mezziWrite: false, routeLavorazioni: false },
  { role: "guest", lavorazioniWrite: false, mezziWrite: false, routeLavorazioni: false },
  { role: "cliente", lavorazioniWrite: false, mezziWrite: false, routeLavorazioni: false },
];

for (const row of matrix) {
  const snap = buildTestSnapshot({ userId: `lav-${row.role}`, roleKey: row.role });
  const r = snap.resolved;

  assert.equal(canWritePage(r, "lavorazioni"), row.lavorazioniWrite, `${row.role} lavorazioni write`);
  assert.equal(canWritePage(r, "mezzi"), row.mezziWrite, `${row.role} mezzi write (create upsert)`);

  const rolePageAccess = seedPageAccessForRole(row.role);
  const routeOk = evaluateGestionaleRouteAccess({
    user: { ruolo: row.role, id: snap.userId ?? `lav-${row.role}` },
    userId: snap.userId ?? `lav-${row.role}`,
    pathname: "/lavorazioni",
    rolePageAccess,
    userPageOverrideRows: [],
    pilotDbEnabled: false,
  });
  assert.equal(routeOk, row.routeLavorazioni, `${row.role} route /lavorazioni`);
}

// Invariante: admin, manager, operatore — stesso accesso write lavorazioni+mezzi
const writeRoles = ["admin", "manager", "operatore"] as const;
const baselines = writeRoles.map((role) => {
  const snap = buildTestSnapshot({ userId: `inv-${role}`, roleKey: role });
  return {
    role,
    lav: canWritePage(snap.resolved, "lavorazioni"),
    mezzi: canWritePage(snap.resolved, "mezzi"),
  };
});
for (let i = 1; i < baselines.length; i += 1) {
  assert.equal(baselines[i]!.lav, baselines[0]!.lav, `parity lavorazioni write ${baselines[i]!.role}`);
  assert.equal(baselines[i]!.mezzi, baselines[0]!.mezzi, `parity mezzi write ${baselines[i]!.role}`);
}

// Override deny intenzionale
const denied = buildTestSnapshot({
  userId: "mgr-deny",
  roleKey: "manager",
  userPageOverrides: [{ page_key: "lavorazioni", access_level: "none" }],
});
assert.equal(canWritePage(denied.resolved, "lavorazioni"), false, "manager override lavorazioni none");

// Cliente: portale read, gestionale lavorazioni no
const cliente = buildTestSnapshot({ userId: "cli-1", roleKey: "cliente" });
assert.equal(canReadPage(cliente.resolved, "lavorazioni_clienti"), true);
assert.equal(canWritePage(cliente.resolved, "lavorazioni"), false);

console.log("lavorazioni-write-path-rbac-matrix.test.ts OK");
