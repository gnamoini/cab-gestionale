import assert from "node:assert/strict";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import { createRbacNavAccess } from "@/src/lib/rbac/rbac-snapshot-access";
import { evaluateGestionaleRouteAccess } from "@/src/lib/auth/evaluate-gestionale-route-access";
import { assertRouteProtection } from "@/lib/regression/assert-route-protection";

type MatrixRow = {
  roleKey: string;
  userId: string;
  sidebar: { href: string; visible: boolean };
  route: { pathname: string; allowed: boolean };
};

const matrix: MatrixRow[] = [
  {
    roleKey: "admin",
    userId: "x-admin",
    sidebar: { href: "/sicurezza", visible: true },
    route: { pathname: "/sicurezza", allowed: true },
  },
  {
    roleKey: "manager",
    userId: "x-mgr",
    sidebar: { href: "/sicurezza", visible: false },
    route: { pathname: "/sicurezza", allowed: false },
  },
  {
    roleKey: "operatore",
    userId: "x-op",
    sidebar: { href: "/lavorazioni", visible: true },
    route: { pathname: "/lavorazioni", allowed: true },
  },
  {
    roleKey: "operatore",
    userId: "x-op",
    sidebar: { href: "/preventivi", visible: false },
    route: { pathname: "/preventivi", allowed: false },
  },
  {
    roleKey: "cliente",
    userId: "x-cli",
    sidebar: { href: "/lavorazioni-clienti", visible: true },
    route: { pathname: "/lavorazioni-clienti", allowed: true },
  },
];

for (const row of matrix) {
  const snap = buildTestSnapshot({ userId: row.userId, roleKey: row.roleKey });
  const nav = createRbacNavAccess(snap, {
    clientLavorazioniAllowed: row.roleKey === "cliente",
  });

  const sidebarVisible = !nav.shouldHideHref(row.sidebar.href) && nav.canAccessHref(row.sidebar.href);
  assert.equal(
    sidebarVisible,
    row.sidebar.visible,
    `${row.roleKey} sidebar ${row.sidebar.href}`,
  );

  const routeAllowed = evaluateGestionaleRouteAccess({
    user: { ruolo: row.roleKey, id: row.userId },
    userId: row.userId,
    pathname: row.route.pathname,
    rolePermissionKeys: snap.rolePermissionKeys,
    permissionRows: [],
    clientLavorazioniAllowed: row.roleKey === "cliente",
  });

  assert.equal(routeAllowed, row.route.allowed, `${row.roleKey} route ${row.route.pathname}`);

  assertRouteProtection(
    { ruolo: row.roleKey, id: row.userId },
    [{ pathname: row.route.pathname, allowed: row.route.allowed }],
    snap,
  );
}

console.log("rbac-cross-layer-matrix.test.ts OK");
