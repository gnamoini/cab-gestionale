import assert from "node:assert/strict";
import { hasPermission, shouldHideNavHref } from "@/lib/auth/rbac";

const admin = { ruolo: "admin" as const, id: "a1" };
const cliente = { ruolo: "cliente" as const, id: "c1" };
const operatore = { ruolo: "operatore" as const, id: "o1" };

assert.equal(hasPermission(admin, "viewClientLavorazioni"), true);
assert.equal(hasPermission(cliente, "viewClientLavorazioni"), true);
assert.equal(hasPermission(operatore, "viewClientLavorazioni"), false);

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
