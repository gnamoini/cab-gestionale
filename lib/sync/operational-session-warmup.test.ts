import assert from "node:assert/strict";
import { resolveSyncEffects } from "@/lib/sync/gestionale-sync-policy";
import {
  beginOperationalSessionWarmup,
  isOperationalSessionWarmingUp,
  OPERATIONAL_SESSION_WARMUP_MS,
  resetOperationalSessionWarmupForTests,
} from "@/lib/sync/operational-session-warmup";
import { shouldSkipOperationalDirtyMark } from "@/lib/sync/operational-dirty-mark-gate";
import {
  clearGestionaleSyncScopesForTests,
  registerGestionaleSyncScope,
} from "@/lib/sync/gestionale-sync-scope";

resetOperationalSessionWarmupForTests();
clearGestionaleSyncScopesForTests();
registerGestionaleSyncScope({
  scopeId: "lav",
  domain: "lavorazioni",
  tables: ["lavorazioni"],
});

beginOperationalSessionWarmup();
assert.equal(isOperationalSessionWarmingUp(), true);
assert.equal(shouldSkipOperationalDirtyMark("lavorazioni"), true);

const warmed = resolveSyncEffects({
  source: "realtime",
  tables: ["lavorazioni"],
  entityIdByTable: new Map([["lavorazioni", "42"]]),
  cabEvents: [],
  flag: "pilot_lavorazioni",
});
assert.deepEqual(warmed.invalidateTables, ["lavorazioni"]);
assert.equal(warmed.dirtyEntries.length, 0);

assert.equal(OPERATIONAL_SESSION_WARMUP_MS, 12_000);

resetOperationalSessionWarmupForTests();
clearGestionaleSyncScopesForTests();

console.log("operational-session-warmup.test.ts OK");
