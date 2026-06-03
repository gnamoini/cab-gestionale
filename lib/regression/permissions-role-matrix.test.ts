/**
 * Fase 8 — matrice permessi ruolo × route (edge capability vs truth layer moduli).
 */
import assert from "node:assert/strict";
import { canAccessPage, canRead, canWrite, canDelete, hasPermission } from "@/lib/auth/rbac";
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
  "/impostazioni",
  "/dashboard/security",
  "/lavorazioni-clienti",
] as const;

type RoleCase = {
  role: string;
  /** Edge / canAccessPage (capability-only). */
  pageExpect: Partial<Record<(typeof ROUTES)[number], boolean>>;
  /** Client canAccessRoute con snapshot moduli. */
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
      "/impostazioni": true,
      "/dashboard/security": false,
      "/lavorazioni-clienti": true,
    },
  },
  {
    role: "operatore",
    pageExpect: {
      "/dashboard": true,
      "/report": true,
      "/impostazioni": true,
      "/dashboard/security": false,
    },
    routeExpect: {
      "/report": false,
    },
    permissionRows: [
      {
        user_id: "op-deny-report",
        module: "report",
        can_read: false,
        can_write: false,
        can_admin: false,
      },
    ],
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
  {
    role: "guest",
    pageExpect: {
      "/dashboard": true,
      "/magazzino": true,
      "/impostazioni": false,
      "/dashboard/security": false,
    },
  },
];

for (const c of cases) {
  for (const [path, allowed] of Object.entries(c.pageExpect)) {
    const actual = canAccessPage(c.role, path);
    assert.equal(actual, allowed, `${c.role} canAccessPage ${path}`);
  }

  if (c.routeExpect) {
    const snap = resolveEffectivePermissions({
      userId: c.permissionRows?.[0]?.user_id ?? `${c.role}-1`,
      ruolo: c.role,
      permissionRows: c.permissionRows ?? [],
      pilotDbEnabled: false,
    });
    for (const [path, allowed] of Object.entries(c.routeExpect)) {
      const actual = canAccessRoute({ user: c.role, pathname: path, snapshot: snap });
      assert.equal(actual, allowed, `${c.role} canAccessRoute ${path} (granular)`);

      const proxyAligned = evaluateGestionaleRouteAccess({
        user: c.role,
        userId: c.permissionRows?.[0]?.user_id ?? `${c.role}-1`,
        pathname: path,
        permissionRows: c.permissionRows ?? [],
      });
      assert.equal(proxyAligned, allowed, `${c.role} proxy evaluate ${path} (granular)`);
    }
  }
}

assert.equal(hasPermission("manager", "manageSettings"), true);
assert.equal(hasPermission("manager", "manageSecurity"), false);
assert.equal(hasPermission("operatore", "manageSettings"), true);
assert.equal(canWrite("guest", "magazzino"), false);
assert.equal(canDelete("cliente", "lavorazioni"), false);

console.log("permissions-role-matrix.test.ts OK");
