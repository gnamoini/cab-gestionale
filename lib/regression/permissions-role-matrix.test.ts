/**
 * RBAC v3.1 — matrice ruolo × route + moduli.
 */
import assert from "node:assert/strict";
import {
  canAccessPage,
  canRead,
  canWrite,
  hasPermission,
} from "@/lib/auth/rbac";
import { canAccessRoute } from "@/src/lib/auth/can-access-route";
import { evaluateGestionaleRouteAccess } from "@/src/lib/auth/evaluate-gestionale-route-access";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";

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
  routeExpect?: Partial<Record<(typeof ROUTES)[number], boolean>>;
  permissionRows?: Array<{
    user_id: string;
    module: string;
    can_read: boolean;
    can_write: boolean;
    can_admin: boolean;
  }>;
};

const cases: RoleCase[] = [
  {
    role: "admin",
    pageExpect: Object.fromEntries(ROUTES.map((r) => [r, true])) as RoleCase["pageExpect"],
  },
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
  const snap = resolveEffectivePermissions({
    userId: c.permissionRows?.[0]?.user_id ?? `${c.role}-1`,
    ruolo: c.role,
    permissionRows: c.permissionRows ?? [],
    pilotDbEnabled: false,
  });

  for (const [path, allowed] of Object.entries(c.pageExpect)) {
    const actual = canAccessPage(c.role, path);
    assert.equal(actual, allowed, `${c.role} canAccessPage ${path}`);
  }

  for (const [path, allowed] of Object.entries(c.pageExpect)) {
    const routeActual = canAccessRoute({ user: c.role, pathname: path, snapshot: snap });
    assert.equal(routeActual, allowed, `${c.role} canAccessRoute ${path}`);
  }

  if (c.routeExpect) {
    for (const [path, allowed] of Object.entries(c.routeExpect)) {
      const actual = canAccessRoute({ user: c.role, pathname: path, snapshot: snap });
      assert.equal(actual, allowed, `${c.role} canAccessRoute ${path} (granular)`);
    }
  }
}

// Override precedence: operatore + FULL preventivi via user_permissions
const operatorePreventiviOverride = resolveEffectivePermissions({
  userId: "op-prev",
  ruolo: "operatore",
  permissionRows: [
    {
      user_id: "op-prev",
      module: "preventivi",
      can_read: true,
      can_write: true,
      can_admin: false,
    },
  ],
  pilotDbEnabled: false,
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

assert.equal(hasPermission("manager", "manageSettings"), true);
assert.equal(hasPermission("manager", "manageSecurity"), false);
assert.equal(hasPermission("operatore", "manageSettings"), false);
assert.equal(hasPermission("addetto_amministrativo", "manageSettings"), false);
assert.equal(canWrite("guest", "magazzino"), false);
assert.equal(canRead("guest", "dipendenti"), true);
assert.equal(canRead("operatore", "dipendenti"), false);

// Mezzi + attrezzature: operatore write, ufficio escluso, admin full
assert.equal(canWrite("operatore", "mezzi"), true);
assert.equal(canRead("addetto_amministrativo", "mezzi"), false);
assert.equal(canWrite("addetto_amministrativo", "mezzi"), false);
assert.equal(canWrite("admin", "mezzi"), true);

console.log("permissions-role-matrix.test.ts OK");
