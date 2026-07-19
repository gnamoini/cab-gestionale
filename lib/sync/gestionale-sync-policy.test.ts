import assert from "node:assert/strict";
import {
  resolveGestionaleDirtySyncMode,
  setGestionaleDirtySyncModeRuntime,
} from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import {
  registerGestionaleSyncScope,
  clearGestionaleSyncScopesForTests,
} from "@/lib/sync/gestionale-sync-scope";
import { resolveSyncEffects, ALWAYS_LIVE_TABLES } from "@/lib/sync/gestionale-sync-policy";
import { resetGestionaleDirtyStateForTests } from "@/lib/sync/gestionale-dirty-state";

const prev = process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC;
clearGestionaleSyncScopesForTests();
resetGestionaleDirtyStateForTests();

registerGestionaleSyncScope({
  scopeId: "lav",
  domain: "lavorazioni",
  tables: ["lavorazioni"],
});

try {
  process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC = "pilot_lavorazioni";
  setGestionaleDirtySyncModeRuntime(resolveGestionaleDirtySyncMode());

  const local = resolveSyncEffects({
    source: "local_mutation",
    tables: ["lavorazioni"],
    entityIdByTable: new Map([["lavorazioni", "1"]]),
    cabEvents: [],
    flag: "pilot_lavorazioni",
  });
  assert.deepEqual(local.invalidateTables, ["lavorazioni"]);
  assert.equal(local.dirtyEntries.length, 0);

  const rbac = resolveSyncEffects({
    source: "realtime",
    tables: ["user_permissions"],
    entityIdByTable: new Map(),
    cabEvents: [],
    flag: "pilot_lavorazioni",
  });
  assert.deepEqual(rbac.invalidateTables, ["user_permissions"]);

  const dirty = resolveSyncEffects({
    source: "realtime",
    tables: ["lavorazioni"],
    entityIdByTable: new Map([["lavorazioni", "42"]]),
    cabEvents: [],
    flag: "pilot_lavorazioni",
  });
  assert.equal(dirty.invalidateTables.length, 0);
  assert.equal(dirty.dirtyEntries.length, 1);
  assert.equal(dirty.dirtyEntries[0]?.entityId, "42");

  clearGestionaleSyncScopesForTests();
  registerGestionaleSyncScope({
    scopeId: "lav-detail",
    domain: "lavorazioni",
    tables: ["lavorazioni"],
    visibleEntities: [{ table: "lavorazioni", entityId: "123" }],
  });

  const noop = resolveSyncEffects({
    source: "realtime",
    tables: ["lavorazioni"],
    entityIdByTable: new Map([["lavorazioni", "900"]]),
    cabEvents: [],
    flag: "pilot_lavorazioni",
  });
  assert.equal(noop.dirtyEntries.length, 0);

  const reconnect = resolveSyncEffects({
    source: "reconnect",
    tables: ["magazzino_ricambi", "lavorazioni"],
    entityIdByTable: new Map(),
    cabEvents: [],
    flag: "pilot_heavy",
  });
  assert.deepEqual(reconnect.invalidateTables, ["magazzino_ricambi", "lavorazioni"]);
  assert.equal(reconnect.dirtyEntries.length, 0);

  const logLive = resolveSyncEffects({
    source: "realtime",
    tables: ["log_modifiche"],
    entityIdByTable: new Map([["log_modifiche", "log-1"]]),
    cabEvents: [],
    flag: "pilot_heavy",
  });
  assert.deepEqual(logLive.invalidateTables, ["log_modifiche"]);
  assert.equal(logLive.dirtyEntries.length, 0);

  assert.ok(ALWAYS_LIVE_TABLES.has("profiles"));
} finally {
  clearGestionaleSyncScopesForTests();
  if (prev === undefined) delete process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC;
  else process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC = prev;
  setGestionaleDirtySyncModeRuntime(resolveGestionaleDirtySyncMode());
}

console.log("gestionale-sync-policy.test.ts OK");
