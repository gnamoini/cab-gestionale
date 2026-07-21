import assert from "node:assert/strict";
import {
  clearRecentLocalGestionaleMutations,
  markRecentLocalGestionaleFromEntityIdByTable,
  shouldSuppressRemoteCacheInvalidation,
} from "@/lib/sync/recent-local-mutation";
import { resolveSyncEffects } from "@/lib/sync/gestionale-sync-policy";
import {
  clearGestionaleSyncScopesForTests,
  registerGestionaleSyncScope,
} from "@/lib/sync/gestionale-sync-scope";

clearRecentLocalGestionaleMutations();
clearGestionaleSyncScopesForTests();

const unregister = registerGestionaleSyncScope({
  scopeId: "lav-test",
  domain: "lavorazioni",
  tables: ["lavorazioni", "scheda_lavorazione"],
});

const entityIdByTable = new Map<string, string>([
  ["lavorazioni", "lav-self"],
  ["scheda_lavorazione", "scheda-self"],
]);

markRecentLocalGestionaleFromEntityIdByTable(entityIdByTable);

const resolved = resolveSyncEffects({
  source: "realtime",
  tables: ["lavorazioni", "scheda_lavorazione"],
  entityIdByTable,
  cabEvents: [],
  flag: "lavorazioni",
});

const visibleDirty = resolved.dirtyEntries.filter(
  (entry) => !shouldSuppressRemoteCacheInvalidation(entry.table, entry.entityId ?? undefined),
);

assert.equal(resolved.dirtyEntries.length, 2, "realtime produces dirty entries for both tables");
assert.equal(visibleDirty.length, 0, "self-echo entries must be suppressed before banner");

unregister();
clearGestionaleSyncScopesForTests();
clearRecentLocalGestionaleMutations();

console.log("gestionale-dirty-self-echo.test.ts OK");
