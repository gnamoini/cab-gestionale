import assert from "node:assert/strict";
import {
  clearGestionaleSyncScopesForTests,
  getActiveSyncContexts,
  getGestionaleSyncScopeGeneration,
  registerGestionaleSyncScope,
  subscribeGestionaleSyncScopes,
} from "@/lib/sync/gestionale-sync-scope";

clearGestionaleSyncScopesForTests();

const scopeA = {
  scopeId: "dashboard-control-tower",
  domain: "dashboard" as const,
  route: "/dashboard",
  tables: ["log_modifiche"],
};

let notifyCount = 0;
const unsub = subscribeGestionaleSyncScopes(() => {
  notifyCount += 1;
});

const unregister = registerGestionaleSyncScope(scopeA);
assert.equal(getActiveSyncContexts().length, 1);
assert.equal(notifyCount, 1);

// replace stesso scopeId — una sola entry
const unregister2 = registerGestionaleSyncScope({
  ...scopeA,
  tables: ["log_modifiche", "lavorazioni"],
});
assert.equal(getActiveSyncContexts().length, 1);
assert.equal(getActiveSyncContexts()[0]?.tables.length, 2);
assert.equal(notifyCount, 2);

unregister2();
assert.equal(getActiveSyncContexts().length, 0);
assert.equal(notifyCount, 3);

const genBefore = getGestionaleSyncScopeGeneration();
registerGestionaleSyncScope(scopeA);
assert.ok(getGestionaleSyncScopeGeneration() > genBefore);

unregister();
unsub();
clearGestionaleSyncScopesForTests();

console.log("gestionale-sync-scope.test.ts OK");
