import assert from "node:assert/strict";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import { createRbacNavAccess } from "@/src/lib/rbac/rbac-snapshot-access";
import { resolveFirstAccessibleNavHref, resolvePostLoginRedirectPath } from "@/lib/auth/resolve-post-login-redirect";

const adminSnap = buildTestSnapshot({ userId: "a1", roleKey: "admin" });
const adminNav = createRbacNavAccess(adminSnap);
const clienteSnap = buildTestSnapshot({ userId: "c1", roleKey: "cliente" });
const clienteNav = createRbacNavAccess(clienteSnap);
const guestSnap = buildTestSnapshot({ userId: "g1", roleKey: "guest" });
const guestNav = createRbacNavAccess(guestSnap);

assert.equal(resolveFirstAccessibleNavHref(adminNav, adminSnap), "/dashboard");
assert.equal(resolveFirstAccessibleNavHref(clienteNav, clienteSnap), "/lavorazioni-clienti");
assert.equal(resolveFirstAccessibleNavHref(guestNav, guestSnap), "/dashboard");

assert.equal(
  resolvePostLoginRedirectPath({
    user: { ruolo: "cliente", id: "c1" },
    navAccess: clienteNav,
    snapshot: clienteSnap,
  }),
  "/lavorazioni-clienti",
);

assert.equal(
  resolvePostLoginRedirectPath({
    user: { ruolo: "cliente", id: "c1" },
    navAccess: null,
  }),
  "/lavorazioni-clienti",
);

assert.equal(
  resolvePostLoginRedirectPath({
    user: { ruolo: "cliente", id: "c1" },
    navAccess: clienteNav,
    snapshot: clienteSnap,
    requestedPath: "/lavorazioni-clienti/abc",
  }),
  "/lavorazioni-clienti/abc",
);

assert.equal(
  resolvePostLoginRedirectPath({
    user: { ruolo: "guest", id: "g1" },
    navAccess: guestNav,
    snapshot: guestSnap,
    requestedPath: "/magazzino",
  }),
  "/magazzino",
);

assert.equal(
  resolvePostLoginRedirectPath({
    user: { ruolo: "cliente", id: "c1" },
    navAccess: clienteNav,
    snapshot: clienteSnap,
    requestedPath: "/dashboard",
  }),
  "/lavorazioni-clienti",
);

assert.equal(adminNav.canAccessHref("/sicurezza"), true);
assert.equal(adminNav.shouldHideHref("/sicurezza"), false);

const operatoreSnap = buildTestSnapshot({ userId: "o1", roleKey: "operatore" });
const operatoreNav = createRbacNavAccess(operatoreSnap);
assert.equal(resolveFirstAccessibleNavHref(operatoreNav, operatoreSnap), "/agenda");
assert.equal(
  resolvePostLoginRedirectPath({
    user: { ruolo: "operatore", id: "o1" },
    navAccess: operatoreNav,
    snapshot: operatoreSnap,
  }),
  "/agenda",
);
assert.equal(operatoreNav.canAccessHref("/dashboard"), false);
assert.equal(operatoreNav.canAccessHref("/sicurezza"), false);
assert.equal(operatoreNav.shouldHideHref("/sicurezza"), true);

console.log("resolve-post-login-redirect.test.ts OK");
