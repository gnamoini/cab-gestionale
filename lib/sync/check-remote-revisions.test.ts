import assert from "node:assert/strict";
import {
  checkRemoteRevisions,
  markDirtyFromVerifiedDrift,
  resetCheckRemoteRevisionsForTests,
} from "@/lib/sync/check-remote-revisions";
import {
  resetOperationalVersionStateForTests,
  setFetchOperationalTableVersionsForTests,
} from "@/lib/sync/operational-data-version";

async function run(): Promise<void> {
  resetCheckRemoteRevisionsForTests();
  resetOperationalVersionStateForTests({ lavorazioni: 10 });
  let fetchCount = 0;
  setFetchOperationalTableVersionsForTests(async () => {
    fetchCount += 1;
    return { lavorazioni: 12, mezzi: 40 };
  });

  const [a, b] = await Promise.all([
    checkRemoteRevisions({ reason: "resume" }),
    checkRemoteRevisions({ reason: "resume" }),
  ]);

  assert.equal(fetchCount, 1, "single-flight must share one RPC");
  assert.equal(a.changedTables.includes("lavorazioni"), true);
  assert.equal(a.changedTables.includes("mezzi"), true);
  assert.deepEqual(a.changedDomains.sort(), ["lavorazioni", "mezzi"]);
  assert.deepEqual(b.changedTables, a.changedTables);

  resetCheckRemoteRevisionsForTests();
  resetOperationalVersionStateForTests({ lavorazioni: 12, mezzi: 40 });
  fetchCount = 0;
  setFetchOperationalTableVersionsForTests(async () => {
    fetchCount += 1;
    return { lavorazioni: 12, mezzi: 40 };
  });

  const noDrift = await checkRemoteRevisions({ reason: "poll" });
  assert.equal(fetchCount, 1);
  assert.deepEqual(noDrift.changedTables, []);

  resetOperationalVersionStateForTests();
  setFetchOperationalTableVersionsForTests(null);
  resetCheckRemoteRevisionsForTests();

  void markDirtyFromVerifiedDrift;
}

void run().then(() => {
  console.log("check-remote-revisions.test.ts OK");
});
