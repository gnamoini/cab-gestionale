/**
 * Regression: sync atomico portale — invalidate prima di clear dirty (ordine statico nel helper).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const src = readFileSync(
  join(root, "src/lib/react-query/sync-client-portal-operational-data.ts"),
  "utf8",
);

const fnMatch = src.match(
  /export async function syncClientPortalOperationalData[\s\S]*?\n\}/,
);
assert.ok(fnMatch, "syncClientPortalOperationalData must exist");
const syncFn = fnMatch[0];

const invalidateIdx = syncFn.indexOf("invalidateGestionaleTables");
const refetchIdx = syncFn.indexOf("runLavorazioniToolbarRefresh");
const ackIdx = syncFn.indexOf("acknowledgeOperationalTableVersions(PORTAL_SYNC_TABLES)");
const clearIdx = syncFn.indexOf("clearGestionaleDirty({ domain: \"portale\" })");

assert.ok(invalidateIdx > 0, "must invalidate portal tables");
assert.ok(refetchIdx > invalidateIdx, "refetch after invalidate");
assert.ok(ackIdx > refetchIdx, "ack after refetch");
assert.ok(clearIdx > ackIdx, "clear dirty after ack");

assert.ok(
  src.includes("acknowledgeClientPortalSyncSuccess"),
  "initial open ack helper without invalidate",
);

console.log("client-portal-atomic-sync.test.ts OK");
