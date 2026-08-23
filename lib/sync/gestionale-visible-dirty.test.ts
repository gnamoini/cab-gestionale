import assert from "node:assert/strict";
import {
  getVisibleDirtyEntries,
  matchesRoute,
} from "@/lib/sync/gestionale-visible-dirty";
import type { DirtyEntry } from "@/lib/sync/gestionale-dirty-state";
import type { GestionaleSyncScopeRegistration } from "@/lib/sync/gestionale-sync-scope";

// matchesRoute — no falsi positivi /report vs /reportistica
assert.equal(matchesRoute("/report", "/report"), true);
assert.equal(matchesRoute("/report/foo", "/report"), true);
assert.equal(matchesRoute("/reportistica", "/report"), false);
assert.equal(matchesRoute("/reportistica/foo", "/report"), false);
assert.equal(matchesRoute("/dashboard", "/dashboard"), true);
assert.equal(matchesRoute("/magazzino", "/dashboard"), false);

const dashboardScope: GestionaleSyncScopeRegistration = {
  scopeId: "dashboard-control-tower",
  domain: "dashboard",
  route: "/dashboard",
  tables: ["log_modifiche"],
};

const dirty: DirtyEntry[] = [
  {
    domain: "dashboard",
    table: "log_modifiche",
    entityId: null,
    type: "update",
    timestamp: Date.now(),
    source: "realtime",
  },
];

// Bug originale — dashboard dirty non visibile su /magazzino
assert.deepEqual(
  getVisibleDirtyEntries({
    pathname: "/magazzino",
    dirtyEntries: dirty,
    scopes: [dashboardScope],
  }),
  [],
);

assert.equal(
  getVisibleDirtyEntries({
    pathname: "/dashboard",
    dirtyEntries: dirty,
    scopes: [dashboardScope],
  }).length,
  1,
);

// scope assente → nessuna entry visibile
assert.deepEqual(
  getVisibleDirtyEntries({
    pathname: "/dashboard",
    dirtyEntries: dirty,
    scopes: [],
  }),
  [],
);

// route mismatch anche con scope attivo
const reportScope: GestionaleSyncScopeRegistration = {
  scopeId: "report-area-panoramica",
  domain: "report",
  route: "/report",
  tables: ["lavorazioni"],
};

const reportDirty: DirtyEntry[] = [
  {
    domain: "report",
    table: "lavorazioni",
    entityId: null,
    type: "update",
    timestamp: Date.now(),
    source: "realtime",
  },
];

assert.deepEqual(
  getVisibleDirtyEntries({
    pathname: "/reportistica",
    dirtyEntries: reportDirty,
    scopes: [reportScope],
  }),
  [],
);

const portalScope: GestionaleSyncScopeRegistration = {
  scopeId: "client-portal-lavorazioni-list",
  domain: "portale",
  route: "/lavorazioni-clienti",
  tables: ["lavorazioni"],
};

const portalDirty: DirtyEntry[] = [
  {
    domain: "portale",
    table: "lavorazioni",
    entityId: null,
    type: "update",
    timestamp: Date.now(),
    source: "realtime",
  },
];

assert.equal(
  getVisibleDirtyEntries({
    pathname: "/lavorazioni-clienti",
    dirtyEntries: portalDirty,
    scopes: [portalScope],
  }).length,
  1,
);

assert.deepEqual(
  getVisibleDirtyEntries({
    pathname: "/lavorazioni",
    dirtyEntries: portalDirty,
    scopes: [portalScope],
  }),
  [],
);

console.log("gestionale-visible-dirty.test.ts OK");
