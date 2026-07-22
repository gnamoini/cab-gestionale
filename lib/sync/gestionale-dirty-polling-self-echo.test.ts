import assert from "node:assert/strict";
import { shouldSkipOperationalDirtyMark } from "@/lib/sync/operational-dirty-mark-gate";
import {
  acknowledgeOperationalTableVersions,
  consumeOperationalVersionPoll,
  diffOperationalTableVersions,
  flushAcknowledgeOperationalTableVersionsForTests,
  isOperationalBaselineAckPending,
  resetOperationalVersionStateForTests,
  setFetchOperationalTableVersionsForTests,
} from "@/lib/sync/operational-data-version";
import {
  clearRecentLocalGestionaleMutations,
  markRecentLocalGestionaleMutation,
} from "@/lib/sync/recent-local-mutation";

async function run(): Promise<void> {
  resetOperationalVersionStateForTests();
  clearRecentLocalGestionaleMutations();

  // --- ack baseline: dopo local_mutation il poll non deve vedere drift proprio ---
  resetOperationalVersionStateForTests({ lavorazioni: 100 });
  setFetchOperationalTableVersionsForTests(async () => ({ lavorazioni: 200 }));

  acknowledgeOperationalTableVersions(["lavorazioni"]);
  assert.equal(isOperationalBaselineAckPending("lavorazioni"), true, "ack pending during debounce");
  assert.equal(
    shouldSkipOperationalDirtyMark("lavorazioni"),
    true,
    "gate blocks dirty while ack pending",
  );

  await flushAcknowledgeOperationalTableVersionsForTests();
  assert.equal(isOperationalBaselineAckPending("lavorazioni"), false, "ack completed");
  assert.deepEqual(
    diffOperationalTableVersions({ lavorazioni: 100 }, { lavorazioni: 200 }),
    ["lavorazioni"],
  );
  assert.deepEqual(
    diffOperationalTableVersions({ lavorazioni: 200 }, { lavorazioni: 200 }),
    [],
    "baseline ack allineata — nessun drift",
  );

  // --- race: poll durante ack pending non deve marcare dirty ---
  resetOperationalVersionStateForTests({ lavorazioni: 100 });
  setFetchOperationalTableVersionsForTests(async () => ({ lavorazioni: 200 }));
  acknowledgeOperationalTableVersions(["lavorazioni"]);
  assert.equal(shouldSkipOperationalDirtyMark("lavorazioni"), true);
  await flushAcknowledgeOperationalTableVersionsForTests();
  const driftedAfterAck = await consumeOperationalVersionPoll();
  assert.deepEqual(
    driftedAfterAck,
    [],
    "after ack aligned, version poll must not report drift",
  );

  // --- suppress gate: mutazione locale recente ---
  markRecentLocalGestionaleMutation(["lavorazioni"], "lav-self");
  assert.equal(
    shouldSkipOperationalDirtyMark("lavorazioni"),
    true,
    "recent local mutation must suppress polling dirty",
  );

  clearRecentLocalGestionaleMutations();
  resetOperationalVersionStateForTests();
}

void run().then(() => {
  console.log("gestionale-dirty-polling-self-echo.test.ts OK");
});
