/**
 * RBAC v3.2 — matrice ruolo × route (data-driven fixtures).
 */
import assert from "node:assert/strict";
import { canAccessPage, canRead, canWrite } from "@/lib/auth/rbac";
import { canWritePage } from "@/src/lib/rbac/resolve-page-access";
import { canAccessRoute } from "@/src/lib/auth/can-access-route";
import type { RequiredRbacContext } from "@/lib/auth/rbac";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";

const ROUTES = [
  "/dashboard",
  "/magazzino",
  "/magazzino/carichi",
  "/lavorazioni",
  "/preventivi",
  "/documenti",
  "/mezzi",
  "/report",
  "/dipendenti",
  "/fatturazione",
  "/impostazioni",
  "/sicurezza",
  "/lavorazioni-clienti",
] as const;

type RoleCase = {
  role: string;
  pageExpect: Partial<Record<(typeof ROUTES)[number], boolean>>;
  userPageOverrides?: { page_key: string; access_level: "write" | "read" | "none" }[];
};

const cases: RoleCase[] = [
  { role: "admin", pageExpect: Object.fromEntries(ROUTES.map((r) => [r, true])) as RoleCase["pageExpect"] },
  {
    role: "manager",
    pageExpect: {
      "/dashboard": true,
      "/magazzino": true,
      "/magazzino/carichi": true,
      "/report": true,
      "/dipendenti": true,
      "/impostazioni": true,
      "/sicurezza": false,
      "/lavorazioni-clienti": false,
    },
  },
  {
    role: "operatore",
    pageExpect: {
      "/dashboard": false,
      "/magazzino": true,
      "/magazzino/carichi": true,
      "/lavorazioni": true,
      "/documenti": true,
      "/mezzi": true,
      "/preventivi": false,
      "/report": false,
      "/dipendenti": false,
      "/fatturazione": false,
      "/impostazioni": false,
      "/sicurezza": false,
      "/lavorazioni-clienti": false,
    },
  },
  {
    role: "addetto_amministrativo",
    pageExpect: {
      "/dashboard": true,
      "/preventivi": true,
      "/fatturazione": true,
      "/report": true,
      "/magazzino": false,
      "/magazzino/carichi": false,
      "/lavorazioni": false,
      "/dipendenti": false,
      "/impostazioni": false,
      "/sicurezza": false,
    },
  },
  {
    role: "guest",
    pageExpect: {
      "/dashboard": true,
      "/magazzino": true,
      "/magazzino/carichi": true,
      "/preventivi": true,
      "/dipendenti": true,
      "/report": true,
      "/impostazioni": false,
      "/sicurezza": false,
      "/lavorazioni-clienti": false,
    },
  },
  {
    role: "cliente",
    pageExpect: {
      "/dashboard": false,
      "/magazzino": false,
      "/magazzino/carichi": false,
      "/lavorazioni-clienti": true,
      "/impostazioni": false,
    },
  },
];

for (const c of cases) {
  const snap = buildTestSnapshot({
    userId: `${c.role}-1`,
    roleKey: c.role,
    userPageOverrides: c.userPageOverrides,
  });
  const ctx = snap.rbacContext as RequiredRbacContext;

  for (const [path, allowed] of Object.entries(c.pageExpect)) {
    const actual = canAccessPage(path, ctx);
    assert.equal(actual, allowed, `${c.role} canAccessPage ${path}`);
  }

  for (const [path, allowed] of Object.entries(c.pageExpect)) {
    const routeActual = canAccessRoute({ pathname: path, snapshot: snap });
    assert.equal(routeActual, allowed, `${c.role} canAccessRoute ${path}`);
  }
}

const operatorePreventiviOverride = buildTestSnapshot({
  userId: "op-prev",
  roleKey: "operatore",
  userPageOverrides: [{ page_key: "preventivi", access_level: "write" }],
});
assert.equal(
  canAccessRoute({
    pathname: "/preventivi",
    snapshot: operatorePreventiviOverride,
  }),
  true,
  "operatore override preventivi write",
);

const mgrCtx = buildTestSnapshot({ userId: "m1", roleKey: "manager" }).rbacContext as RequiredRbacContext;
assert.equal(canWrite("manager", "impostazioni", mgrCtx), true);
assert.equal(canWrite("manager", "security", mgrCtx), false);
assert.equal(
  canWrite("operatore", "impostazioni", buildTestSnapshot({ userId: "o1", roleKey: "operatore" }).rbacContext as RequiredRbacContext),
  false,
);
assert.equal(canWrite("guest", "magazzino", buildTestSnapshot({ userId: "g1", roleKey: "guest" }).rbacContext as RequiredRbacContext), false);
assert.equal(canRead("guest", "dipendenti", buildTestSnapshot({ userId: "g1", roleKey: "guest" }).rbacContext as RequiredRbacContext), true);
assert.equal(canRead("operatore", "dipendenti", buildTestSnapshot({ userId: "o1", roleKey: "operatore" }).rbacContext as RequiredRbacContext), false);

const mgrSnap = buildTestSnapshot({ userId: "m1", roleKey: "manager" });
assert.equal(canWritePage(mgrSnap.resolved, "impostazioni"), true);
assert.equal(canWritePage(mgrSnap.resolved, "sicurezza"), false);
assert.equal(canWritePage(mgrSnap.resolved, "lavorazioni"), true, "manager lavorazioni write");
assert.equal(
  canWritePage(buildTestSnapshot({ userId: "o1", roleKey: "operatore" }).resolved, "lavorazioni"),
  true,
  "operatore lavorazioni write",
);
assert.equal(
  canWritePage(buildTestSnapshot({ userId: "aa1", roleKey: "addetto_amministrativo" }).resolved, "lavorazioni"),
  false,
  "addetto_amministrativo lavorazioni none",
);

console.log("permissions-role-matrix.test.ts OK");
