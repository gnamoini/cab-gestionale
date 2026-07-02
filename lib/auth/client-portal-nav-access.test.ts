import assert from "node:assert/strict";
import { rbacSeedPermissionKeysForRole } from "@/lib/rbac-seed";
import { hasPermission, shouldHideNavHref, type RbacEvaluationContext } from "@/lib/auth/rbac";
import { resolveUserPermissions } from "@/src/lib/rbac/resolve-user-permissions";

function ctxFor(roleKey: string): RbacEvaluationContext {
  return {
    resolved: resolveUserPermissions({
      userId: "test-user",
      roleKey,
      rolePermissionKeys: rbacSeedPermissionKeysForRole(roleKey),
      userOverrides: [],
    }),
  };
}

const admin = { ruolo: "admin" as const, id: "a1" };
const cliente = { ruolo: "cliente" as const, id: "c1" };
const operatore = { ruolo: "operatore" as const, id: "o1" };

assert.equal(hasPermission(admin, "viewClientLavorazioni", ctxFor("admin")), true);
assert.equal(hasPermission(cliente, "viewClientLavorazioni", ctxFor("cliente")), true);
assert.equal(hasPermission(operatore, "viewClientLavorazioni", ctxFor("operatore")), false);
assert.equal(hasPermission(admin, "viewClientLavorazioni"), false, "fail-closed senza snapshot risolto");

assert.equal(
  shouldHideNavHref(admin, "/lavorazioni-clienti", { clientLavorazioniAllowed: true }),
  false,
  "admin vede Portale Clienti senza attesa async",
);

assert.equal(
  shouldHideNavHref(cliente, "/lavorazioni-clienti", { clientLavorazioniAllowed: true }),
  false,
);

assert.equal(
  shouldHideNavHref(operatore, "/lavorazioni-clienti", { clientLavorazioniAllowed: false }),
  true,
);

console.log("client-portal-nav-access.test.ts OK");
