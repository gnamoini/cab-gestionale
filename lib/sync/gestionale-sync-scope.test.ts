import assert from "node:assert/strict";
import {
  registerGestionaleSyncScope,
  getActiveSyncContexts,
  clearGestionaleSyncScopesForTests,
} from "@/lib/sync/gestionale-sync-scope";

clearGestionaleSyncScopesForTests();

const unregister = registerGestionaleSyncScope({
  scopeId: "test-scope",
  domain: "lavorazioni",
  tables: ["lavorazioni"],
});

assert.equal(getActiveSyncContexts().length, 1);
assert.equal(getActiveSyncContexts()[0]?.scopeId, "test-scope");

unregister();
assert.equal(getActiveSyncContexts().length, 0);

console.log("gestionale-sync-scope.test.ts OK");
