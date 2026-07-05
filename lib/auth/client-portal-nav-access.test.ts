import assert from "node:assert/strict";
import { shouldHideNavHref } from "@/lib/auth/rbac";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import type { RequiredRbacContext } from "@/lib/auth/rbac";
import { canReadPage } from "@/src/lib/rbac/resolve-page-access";

function ctxFor(roleKey: string): RequiredRbacContext {
  return buildTestSnapshot({ userId: "test-user", roleKey }).rbacContext as RequiredRbacContext;
}

const admin = { ruolo: "admin" as const, id: "a1" };
const cliente = { ruolo: "cliente" as const, id: "c1" };
const operatore = { ruolo: "operatore" as const, id: "o1" };
const adminCtx = ctxFor("admin");

assert.equal(canReadPage(adminCtx.resolved, "lavorazioni_clienti"), true);
assert.equal(canReadPage(ctxFor("cliente").resolved, "lavorazioni_clienti"), true);
assert.equal(canReadPage(ctxFor("operatore").resolved, "lavorazioni_clienti"), false);

assert.equal(
  shouldHideNavHref(admin, "/lavorazioni-clienti", undefined, adminCtx),
  false,
  "admin vede Portale Clienti con snapshot",
);

assert.equal(
  shouldHideNavHref(cliente, "/lavorazioni-clienti", undefined, ctxFor("cliente")),
  false,
);

assert.equal(
  shouldHideNavHref(operatore, "/lavorazioni-clienti", undefined, ctxFor("operatore")),
  true,
);

console.log("client-portal-nav-access.test.ts OK");
