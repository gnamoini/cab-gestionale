/**
 * Regression: portale senza scope → realtime lavorazioni dropato in resolveSyncEffects.
 * Con scope domain "portale" → dirty (no invalidate live).
 */
import assert from "node:assert/strict";
import {
  resolveGestionaleDirtySyncMode,
  setGestionaleDirtySyncModeRuntime,
} from "@/lib/feature-flags/gestionale-dirty-sync-flag";
import {
  clearGestionaleSyncScopesForTests,
  registerGestionaleSyncScope,
} from "@/lib/sync/gestionale-sync-scope";
import { resolveSyncEffects } from "@/lib/sync/gestionale-sync-policy";
import { resetGestionaleDirtyStateForTests } from "@/lib/sync/gestionale-dirty-state";
import {
  beginOperationalSessionWarmup,
  resetOperationalSessionWarmupForTests,
} from "@/lib/sync/operational-session-warmup";
import { CLIENT_PORTAL_SYNC_TABLES } from "@/lib/lavorazioni/client-portal-sync-tables";

const prev = process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC;
clearGestionaleSyncScopesForTests();
resetGestionaleDirtyStateForTests();
resetOperationalSessionWarmupForTests();

try {
  process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC = "pilot_heavy";
  setGestionaleDirtySyncModeRuntime(resolveGestionaleDirtySyncMode());

  const dropped = resolveSyncEffects({
    source: "realtime",
    tables: ["lavorazioni"],
    entityIdByTable: new Map([["lavorazioni", "lav-portal-1"]]),
    cabEvents: [{ type: "entity_updated", entity: "lavorazioni", id: "lav-portal-1", table: "lavorazioni" }],
    flag: "pilot_heavy",
  });
  assert.equal(dropped.invalidateTables.length, 0, "no scope: realtime lavorazioni must not invalidate");
  assert.equal(dropped.dirtyEntries.length, 0, "no scope: realtime lavorazioni must not mark dirty");

  const unregister = registerGestionaleSyncScope({
    scopeId: "client-portal-lavorazioni-list",
    domain: "portale",
    route: "/lavorazioni-clienti",
    tables: [...CLIENT_PORTAL_SYNC_TABLES],
  });

  const withScope = resolveSyncEffects({
    source: "realtime",
    tables: ["lavorazioni"],
    entityIdByTable: new Map([["lavorazioni", "lav-portal-2"]]),
    cabEvents: [{ type: "entity_updated", entity: "lavorazioni", id: "lav-portal-2", table: "lavorazioni" }],
    flag: "pilot_heavy",
  });
  assert.equal(withScope.invalidateTables.length, 0, "portale scope: must not invalidate live");
  assert.equal(withScope.dirtyEntries.length, 1, "portale scope: must mark dirty");
  assert.equal(withScope.dirtyEntries[0]?.domain, "portale");

  const archiveUpdate = resolveSyncEffects({
    source: "realtime",
    tables: ["lavorazioni"],
    entityIdByTable: new Map([["lavorazioni", "lav-archived"]]),
    cabEvents: [{ type: "entity_updated", entity: "lavorazioni", id: "lav-archived", table: "lavorazioni" }],
    flag: "pilot_heavy",
  });
  assert.equal(archiveUpdate.invalidateTables.length, 0);
  assert.equal(archiveUpdate.dirtyEntries.length, 1);

  unregister();

  process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC = "all";
  setGestionaleDirtySyncModeRuntime(resolveGestionaleDirtySyncMode());
  registerGestionaleSyncScope({
    scopeId: "client-portal-lavorazioni-list",
    domain: "portale",
    route: "/lavorazioni-clienti",
    tables: ["lavorazioni"],
  });

  const flagAllWithPortalHeavy = resolveSyncEffects({
    source: "realtime",
    tables: ["lavorazioni"],
    entityIdByTable: new Map([["lavorazioni", "lav-all-mode"]]),
    cabEvents: [{ type: "entity_updated", entity: "lavorazioni", id: "lav-all-mode", table: "lavorazioni" }],
    flag: "all",
  });
  assert.equal(flagAllWithPortalHeavy.invalidateTables.length, 0, "flag all + portale pilot_heavy: dirty only");
  assert.equal(flagAllWithPortalHeavy.dirtyEntries.length, 1);

  beginOperationalSessionWarmup();
  const warmup = resolveSyncEffects({
    source: "realtime",
    tables: ["lavorazioni"],
    entityIdByTable: new Map([["lavorazioni", "lav-warmup"]]),
    cabEvents: [],
    flag: "all",
  });
  assert.deepEqual(warmup.invalidateTables, ["lavorazioni"], "warmup: live invalidate before dirty policy");
  assert.equal(warmup.dirtyEntries.length, 0);
  resetOperationalSessionWarmupForTests();
} finally {
  clearGestionaleSyncScopesForTests();
  resetGestionaleDirtyStateForTests();
  resetOperationalSessionWarmupForTests();
  if (prev === undefined) delete process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC;
  else process.env.NEXT_PUBLIC_GESTIONALE_DIRTY_SYNC = prev;
  setGestionaleDirtySyncModeRuntime(resolveGestionaleDirtySyncMode());
}

console.log("client-portal-sync-policy.test.ts OK");
