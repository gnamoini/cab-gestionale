import assert from "node:assert/strict";
import { GESTIONALE_PAGES } from "@/src/lib/permissions/gestionale-pages";
import { seedPageAccessForRole } from "@/lib/rbac-page-seed";
import {
  canReadPage,
  canWritePage,
  isPageVisible,
  resolvePageAccess,
} from "@/src/lib/rbac/resolve-page-access";

const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

// Admin bypass — tutte le pagine write
const admin = resolvePageAccess({
  userId: USER,
  roleKey: "admin",
  rolePageAccess: {},
  userPageOverrides: {},
});
for (const page of GESTIONALE_PAGES) {
  assert.equal(canWritePage(admin, page.key as never), true, `admin write ${page.key}`);
  assert.equal(isPageVisible(admin, page.key as never), true, `admin visible ${page.key}`);
}

// Guest — default none
const guest = resolvePageAccess({
  userId: USER,
  roleKey: "guest",
  rolePageAccess: seedPageAccessForRole("guest"),
  userPageOverrides: {},
});
assert.equal(canReadPage(guest, "lavorazioni"), false);
assert.equal(isPageVisible(guest, "sicurezza"), false);

// Override utente batte ruolo
const operatoreBase = seedPageAccessForRole("operatore");
const withOverride = resolvePageAccess({
  userId: USER,
  roleKey: "operatore",
  rolePageAccess: operatoreBase,
  userPageOverrides: { magazzino: "none" },
});
assert.equal(canReadPage(withOverride, "magazzino"), false, "override none denies read");
assert.equal(canReadPage(withOverride, "lavorazioni"), true, "other pages from role");

// Override read-only
const readOnlyMag = resolvePageAccess({
  userId: USER,
  roleKey: "operatore",
  rolePageAccess: operatoreBase,
  userPageOverrides: { magazzino: "read" },
});
assert.equal(canReadPage(readOnlyMag, "magazzino"), true);
assert.equal(canWritePage(readOnlyMag, "magazzino"), false);

// Espansione moduli — preventivi espande ddt
const prevWrite = resolvePageAccess({
  userId: USER,
  roleKey: "operatore",
  rolePageAccess: { ...operatoreBase, preventivi: "write" },
  userPageOverrides: {},
});
assert.equal(prevWrite.modules.ddt.canWrite, true, "preventivi write expands ddt.write");

console.log("page-access-resolver.test.ts OK");
