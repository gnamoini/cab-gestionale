/**
 * Regression: ack portale dopo sync; dirty mark skipped durante ack pending.
 */
import assert from "node:assert/strict";
import {
  acknowledgeOperationalTableVersions,
  isOperationalBaselineAckPending,
  resetOperationalVersionStateForTests,
  setFetchOperationalTableVersionsForTests,
  flushAcknowledgeOperationalTableVersionsForTests,
} from "@/lib/sync/operational-data-version";
import { shouldSkipOperationalDirtyMark } from "@/lib/sync/operational-dirty-mark-gate";
import { CLIENT_PORTAL_SYNC_TABLES } from "@/lib/lavorazioni/client-portal-sync-tables";

async function run(): Promise<void> {
  resetOperationalVersionStateForTests({ lavorazioni: 10 });
  setFetchOperationalTableVersionsForTests(async () => ({ lavorazioni: 12 }));

  acknowledgeOperationalTableVersions(["lavorazioni"]);
  assert.equal(isOperationalBaselineAckPending("lavorazioni"), true, "ack pending during debounce");
  assert.equal(shouldSkipOperationalDirtyMark("lavorazioni"), true, "skip dirty during ack race");

  await flushAcknowledgeOperationalTableVersionsForTests();
  assert.equal(isOperationalBaselineAckPending("lavorazioni"), false, "ack completed");
  assert.equal(shouldSkipOperationalDirtyMark("lavorazioni"), false);

  resetOperationalVersionStateForTests();
  setFetchOperationalTableVersionsForTests(null);

  assert.ok(CLIENT_PORTAL_SYNC_TABLES.includes("lavorazioni"), "portal sync tables include lavorazioni");
}

run()
  .then(() => console.log("client-portal-version-ack.test.ts OK"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
