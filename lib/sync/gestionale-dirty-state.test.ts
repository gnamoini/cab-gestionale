import assert from "node:assert/strict";
import {
  markGestionaleDirty,
  clearGestionaleDirty,
  isDirtyRelevantForScope,
  getDirtyForScope,
  getDirtyForActiveScopesSnapshot,
  resetGestionaleDirtyStateForTests,
} from "@/lib/sync/gestionale-dirty-state";
import type { GestionaleSyncScopeRegistration } from "@/lib/sync/gestionale-sync-scope";

resetGestionaleDirtyStateForTests();

const listScope: GestionaleSyncScopeRegistration = {
  scopeId: "lav-list",
  domain: "lavorazioni",
  tables: ["lavorazioni"],
};

const detailScope: GestionaleSyncScopeRegistration = {
  scopeId: "lav-detail",
  domain: "lavorazioni",
  tables: ["lavorazioni"],
  visibleEntities: [{ table: "lavorazioni", entityId: "123" }],
};

markGestionaleDirty({
  domain: "lavorazioni",
  table: "lavorazioni",
  entityId: "900",
  type: "update",
  timestamp: Date.now(),
  source: "realtime",
});

assert.equal(isDirtyRelevantForScope(
  { domain: "lavorazioni", table: "lavorazioni", entityId: "900", type: "update", timestamp: 0, source: "realtime" },
  detailScope,
), false);

assert.equal(isDirtyRelevantForScope(
  { domain: "lavorazioni", table: "lavorazioni", entityId: "900", type: "update", timestamp: 0, source: "realtime" },
  listScope,
), true);

markGestionaleDirty({
  domain: "lavorazioni",
  table: "lavorazioni",
  entityId: "123",
  type: "update",
  timestamp: Date.now(),
  source: "realtime",
});

assert.equal(getDirtyForScope(detailScope).length, 1);
assert.equal(getDirtyForScope(detailScope)[0]?.entityId, "123");

clearGestionaleDirty({ domain: "lavorazioni" });
assert.equal(getDirtyForScope(listScope).length, 0);

const stableA = getDirtyForActiveScopesSnapshot([listScope]);
const stableB = getDirtyForActiveScopesSnapshot([listScope]);
assert.equal(stableA, stableB);

markGestionaleDirty({
  domain: "lavorazioni",
  table: "lavorazioni",
  entityId: "1",
  type: "update",
  timestamp: Date.now(),
  source: "realtime",
});
const stableC = getDirtyForActiveScopesSnapshot([listScope]);
assert.notEqual(stableA, stableC);

console.log("gestionale-dirty-state.test.ts OK");
