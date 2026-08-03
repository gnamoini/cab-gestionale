/**
 * Regression: burst dirty mark lista portale → un solo entry visibile; hasDirty coerente.
 */
import assert from "node:assert/strict";
import {
  getGestionaleDirtySnapshot,
  markGestionaleDirty,
  resetGestionaleDirtyStateForTests,
} from "@/lib/sync/gestionale-dirty-state";
import { clearGestionaleSyncScopesForTests } from "@/lib/sync/gestionale-sync-scope";
import { getVisibleDirtyEntries } from "@/lib/sync/gestionale-visible-dirty";

const portalScope = {
  scopeId: "client-portal-lavorazioni-list",
  domain: "portale" as const,
  route: "/lavorazioni-clienti",
  tables: ["lavorazioni"],
};

clearGestionaleSyncScopesForTests();
resetGestionaleDirtyStateForTests();

const now = Date.now();
for (let i = 0; i < 5; i++) {
  markGestionaleDirty({
    domain: "portale",
    table: "lavorazioni",
    entityId: null,
    type: "update",
    timestamp: now + i,
    source: "realtime",
  });
}

const snapshotEntries = [...getGestionaleDirtySnapshot().entries.values()];
assert.equal(snapshotEntries.length, 1, "list-level marks replace same dirty key");

const visible = getVisibleDirtyEntries({
  pathname: "/lavorazioni-clienti",
  scopes: [portalScope],
  dirtyEntries: snapshotEntries,
});

assert.equal(visible.length, 1, "one visible dirty entry on portal route");
assert.equal(visible.length > 0, true, "hasDirty equivalent");

const offRoute = getVisibleDirtyEntries({
  pathname: "/lavorazioni",
  scopes: [portalScope],
  dirtyEntries: snapshotEntries,
});
assert.equal(offRoute.length, 0, "portal dirty hidden off portal route");

clearGestionaleSyncScopesForTests();
resetGestionaleDirtyStateForTests();

console.log("client-portal-banner-dedup.test.ts OK");
