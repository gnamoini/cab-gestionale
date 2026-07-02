/**
 * RBAC v3.2 — matrice ruolo × route (data-driven fixtures).
 */
import assert from "node:assert/strict";
import { canAccessPage, canRead, canWrite, hasPermission } from "@/lib/auth/rbac";
import { canAccessRoute } from "@/src/lib/auth/can-access-route";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";

const ROUTES = [
  "/dashboard",
  "/magazzino",
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
  userOverrides?: { permissionKey: string; effect: "allow" | "deny" }[];
};

const cases: RoleCase[] = [
  { role: "admin", pageExpect: Object.fromEntries(ROUTES.map((r) => [r, true])) as RoleCase["pageExpect"] },
  {
    role: "manager",
    pageExpect: {
      "/dashboard": true,
      "/magazzino": true,
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
      "/dashboard": true,
      "/magazzino": true,
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
      "/lavorazioni-clienti": true,
      "/impostazioni": false,
    },
  },
];

for (const c of cases) {
  const snap = buildTestSnapshot({
    userId: `${c.role}-1`,
    roleKey: c.role,
    userOverrides: c.userOverrides,
  });
  const ctx = snap.rbacContext;

  for (const [path, allowed] of Object.entries(c.pageExpect)) {
    const actual = canAccessPage(c.role, path, undefined, ctx);
    assert.equal(actual, allowed, `${c.role} canAccessPage ${path}`);
  }

  for (const [path, allowed] of Object.entries(c.pageExpect)) {
    const routeActual = canAccessRoute({ user: c.role, pathname: path, snapshot: snap });
    assert.equal(routeActual, allowed, `${c.role} canAccessRoute ${path}`);
  }
}

const operatorePreventiviOverride = buildTestSnapshot({
  userId: "op-prev",
  roleKey: "operatore",
  userOverrides: [
    { permissionKey: "preventivi.read", effect: "allow" },
    { permissionKey: "preventivi.write", effect: "allow" },
  ],
});
assert.equal(
  canAccessRoute({
    user: "operatore",
    pathname: "/preventivi",
    snapshot: operatorePreventiviOverride,
  }),
  true,
  "operatore override FULL preventivi",
);

const mgrCtx = buildTestSnapshot({ userId: "m1", roleKey: "manager" }).rbacContext;
assert.equal(hasPermission("manager", "manageSettings", mgrCtx), true);
assert.equal(hasPermission("manager", "manageSecurity", mgrCtx), false);
assert.equal(hasPermission("operatore", "manageSettings", buildTestSnapshot({ userId: "o1", roleKey: "operatore" }).rbacContext), false);
assert.equal(canWrite("guest", "magazzino", buildTestSnapshot({ userId: "g1", roleKey: "guest" }).rbacContext), false);
assert.equal(canRead("guest", "dipendenti", buildTestSnapshot({ userId: "g1", roleKey: "guest" }).rbacContext), true);
assert.equal(canRead("operatore", "dipendenti", buildTestSnapshot({ userId: "o1", roleKey: "operatore" }).rbacContext), false);

console.log("permissions-role-matrix.test.ts OK");
