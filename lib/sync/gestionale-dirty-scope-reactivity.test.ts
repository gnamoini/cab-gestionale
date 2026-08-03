import assert from "node:assert/strict";
import {
  markGestionaleDirty,
  resetGestionaleDirtyStateForTests,
} from "@/lib/sync/gestionale-dirty-state";
import {
  clearGestionaleSyncScopesForTests,
  registerGestionaleSyncScope,
} from "@/lib/sync/gestionale-sync-scope";
import { getVisibleDirtyEntries } from "@/lib/sync/gestionale-visible-dirty";

resetGestionaleDirtyStateForTests();
clearGestionaleSyncScopesForTests();

const dashboardScope = {
  scopeId: "dashboard-control-tower",
  domain: "dashboard" as const,
  route: "/dashboard",
  tables: ["log_modifiche"],
};

const magazzinoScope = {
  scopeId: "magazzino-view",
  domain: "magazzino" as const,
  route: "/magazzino",
  tables: ["magazzino_ricambi"],
};

markGestionaleDirty({
  domain: "dashboard",
  table: "log_modifiche",
  entityId: null,
  type: "update",
  timestamp: Date.now(),
  source: "realtime",
});

const allDirty = [
  {
    domain: "dashboard" as const,
    table: "log_modifiche",
    entityId: null,
    type: "update" as const,
    timestamp: Date.now(),
    source: "realtime" as const,
  },
];

const unregisterDash = registerGestionaleSyncScope(dashboardScope);
assert.equal(
  getVisibleDirtyEntries({
    pathname: "/dashboard",
    scopes: [dashboardScope],
    dirtyEntries: allDirty,
  }).length,
  1,
);

unregisterDash();
const unregisterMag = registerGestionaleSyncScope(magazzinoScope);

// dirty invariato, scope cambiato → dashboard non visibile su /magazzino
assert.deepEqual(
  getVisibleDirtyEntries({
    pathname: "/magazzino",
    scopes: [magazzinoScope],
    dirtyEntries: allDirty,
  }),
  [],
);

unregisterMag();
clearGestionaleSyncScopesForTests();
resetGestionaleDirtyStateForTests();

console.log("gestionale-dirty-scope-reactivity.test.ts OK");
