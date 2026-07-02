import assert from "node:assert/strict";
import { GESTIONALE_NAV } from "@/components/gestionale/gestionale-nav-config";
import { resolveGestionaleNav } from "@/components/gestionale/gestionale-nav-config";
import { buildTestSnapshot } from "@/lib/regression/rbac-test-fixtures";
import { createRbacNavAccess } from "@/src/lib/rbac/rbac-snapshot-access";

function visibleHrefs(roleKey: string, clientLavorazioniAllowed = false): string[] {
  const snap = buildTestSnapshot({ userId: `${roleKey}-1`, roleKey });
  const nav = createRbacNavAccess(snap, { clientLavorazioniAllowed });
  return resolveGestionaleNav({ hideHref: (href) => nav.shouldHideHref(href) })
    .filter((item) => !item.disabled && nav.canAccessHref(item.href))
    .map((item) => item.href);
}

const admin = visibleHrefs("admin");
assert.ok(admin.includes("/dashboard"), "admin: dashboard");
assert.ok(admin.includes("/magazzino"), "admin: magazzino");
assert.ok(admin.includes("/sicurezza"), "admin: sicurezza");
assert.equal(admin.length, GESTIONALE_NAV.length, "admin vede tutte le voci");

const operatore = visibleHrefs("operatore");
assert.ok(operatore.includes("/lavorazioni"), "operatore: lavorazioni");
assert.ok(operatore.includes("/magazzino"), "operatore: magazzino");
assert.ok(!operatore.includes("/sicurezza"), "operatore: no sicurezza");
assert.ok(!operatore.includes("/preventivi"), "operatore: no preventivi");

const manager = visibleHrefs("manager");
assert.ok(manager.includes("/impostazioni"), "manager: impostazioni");
assert.ok(!manager.includes("/sicurezza"), "manager: no sicurezza");

const guest = visibleHrefs("guest");
assert.ok(guest.includes("/dashboard"), "guest: dashboard");
assert.ok(!guest.includes("/impostazioni"), "guest: no impostazioni");

const cliente = visibleHrefs("cliente", true);
assert.deepEqual(
  cliente,
  ["/lavorazioni-clienti"],
  "cliente: solo portale clienti",
);

console.log("sidebar-nav-rbac.test.ts OK");
