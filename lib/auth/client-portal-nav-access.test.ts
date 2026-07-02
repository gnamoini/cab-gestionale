import assert from "node:assert/strict";
import { hasPermissionUnsafe, shouldHideNavHref } from "@/lib/auth/rbac";
import { rbacSeedPermissionKeysForRole } from "@/lib/rbac-seed";
import { resolveUserPermissions } from "@/src/lib/rbac/resolve-user-permissions";
import type { RbacEvaluationContext } from "@/lib/rbac";

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
const adminCtx = ctxFor("admin") as Parameters<typeof hasPermissionUnsafe>[2];

assert.equal(hasPermissionUnsafe(admin, "viewClientLavorazioni", adminCtx), true);
assert.equal(hasPermissionUnsafe(cliente, "viewClientLavorazioni", ctxFor("cliente")), true);
assert.equal(hasPermissionUnsafe(operatore, "viewClientLavorazioni", ctxFor("operatore")), false);
assert.equal(hasPermissionUnsafe(admin, "viewClientLavorazioni"), false, "fail-closed senza snapshot risolto");

assert.equal(
  shouldHideNavHref(admin, "/lavorazioni-clienti", { clientLavorazioniAllowed: true }, adminCtx as never),
  false,
  "admin vede Portale Clienti con snapshot",
);

assert.equal(
  shouldHideNavHref(cliente, "/lavorazioni-clienti", { clientLavorazioniAllowed: true }, ctxFor("cliente") as never),
  false,
);

assert.equal(
  shouldHideNavHref(operatore, "/lavorazioni-clienti", { clientLavorazioniAllowed: false }, ctxFor("operatore") as never),
  true,
);

console.log("client-portal-nav-access.test.ts OK");
