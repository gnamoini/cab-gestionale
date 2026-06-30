/**
 * RBAC v3.1 — matrice ruolo × route + moduli + bunder hard gate.
 */
import assert from "node:assert/strict";
import {
  canAccessBunder,
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
  "/bunder",
  "/fatturazione",
  "/impostazioni",
  "/dashboard/security",
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
      "/bunder": true,
      "/dipendenti": true,
      "/impostazioni": true,
      "/dashboard/security": false,
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
      "/bunder": false,
      "/fatturazione": false,
      "/impostazioni": false,
      "/dashboard/security": false,
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
      "/bunder": false,
      "/dipendenti": false,
      "/impostazioni": false,
      "/dashboard/security": false,
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
      "/bunder": true,
      "/impostazioni": false,
      "/dashboard/security": false,
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
      "/bunder": false,
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
assert.equal(canAccessBunder("guest", "read"), true);
assert.equal(canAccessBunder("guest", "write"), false);
assert.equal(canAccessBunder("operatore", "read"), false);
assert.equal(canAccessBunder("manager", "write"), true);

console.log("permissions-role-matrix.test.ts OK");
