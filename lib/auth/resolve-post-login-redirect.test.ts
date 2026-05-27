import assert from "node:assert/strict";
import {
  resolveFirstAccessibleNavHref,
  resolvePostLoginRedirectPath,
  sanitizePostLoginRequestedPath,
} from "@/lib/auth/resolve-post-login-redirect";

const admin = { ruolo: "admin" as const, id: "a1" };
const cliente = { ruolo: "cliente" as const, id: "c1" };
const guest = { ruolo: "guest" as const, id: "g1" };

assert.equal(sanitizePostLoginRequestedPath("/magazzino"), "/magazzino");
assert.equal(sanitizePostLoginRequestedPath("//evil"), null);
assert.equal(sanitizePostLoginRequestedPath("/login"), null);

assert.equal(resolveFirstAccessibleNavHref(admin), "/dashboard");
assert.equal(resolveFirstAccessibleNavHref(cliente, { clientLavorazioniAllowed: true }), "/lavorazioni-clienti");
assert.equal(resolveFirstAccessibleNavHref(guest), "/dashboard");

assert.equal(
  resolvePostLoginRedirectPath({ user: cliente, clientLavorazioniAllowed: true }),
  "/lavorazioni-clienti",
);

assert.equal(
  resolvePostLoginRedirectPath({
    user: guest,
    requestedPath: "/magazzino",
  }),
  "/magazzino",
);

assert.equal(
  resolvePostLoginRedirectPath({
    user: cliente,
    requestedPath: "/dashboard",
    clientLavorazioniAllowed: true,
  }),
  "/lavorazioni-clienti",
);

console.log("resolve-post-login-redirect.test.ts OK");
