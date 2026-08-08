import assert from "node:assert/strict";
import {
  buildGestionaleRoute,
  isPersistableGestionaleRoute,
  loadLastGestionaleRoute,
  saveLastGestionaleRoute,
} from "@/lib/navigation/last-route-persistence";

const g = globalThis as typeof globalThis & { localStorage?: Storage; window?: Window };
const store = new Map<string, string>();
g.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => {
    store.set(k, v);
  },
  removeItem: (k) => {
    store.delete(k);
  },
  clear: () => store.clear(),
  key: () => null,
  length: 0,
};
g.window = g as unknown as Window & typeof globalThis;

store.clear();

assert.equal(buildGestionaleRoute("/lavorazioni", ""), "/lavorazioni");
assert.equal(buildGestionaleRoute("/lavorazioni", "?tab=aperte"), "/lavorazioni?tab=aperte");
assert.equal(buildGestionaleRoute("/lavorazioni", "tab=aperte"), "/lavorazioni?tab=aperte");

assert.equal(isPersistableGestionaleRoute("/lavorazioni"), true);
assert.equal(isPersistableGestionaleRoute("/lavorazioni?tab=aperte"), true);
assert.equal(isPersistableGestionaleRoute("//evil"), false);
assert.equal(isPersistableGestionaleRoute("/login"), false);
assert.equal(isPersistableGestionaleRoute("/login/foo"), false);
assert.equal(isPersistableGestionaleRoute("/acesso-negato"), false);
assert.equal(isPersistableGestionaleRoute("/offline"), false);
assert.equal(isPersistableGestionaleRoute("/"), false);

saveLastGestionaleRoute("user-a", "/lavorazioni?tab=aperte");
assert.equal(loadLastGestionaleRoute("user-a"), "/lavorazioni?tab=aperte");
assert.equal(loadLastGestionaleRoute("user-b"), null, "per-user isolation");

saveLastGestionaleRoute("user-a", "/login");
assert.equal(loadLastGestionaleRoute("user-a"), "/lavorazioni?tab=aperte", "reject /login write");

saveLastGestionaleRoute("user-a", "//evil");
assert.equal(loadLastGestionaleRoute("user-a"), "/lavorazioni?tab=aperte", "reject evil write");

console.log("last-route-persistence.test.ts OK");
