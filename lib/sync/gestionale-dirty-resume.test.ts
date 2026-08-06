import assert from "node:assert/strict";
import {
  clearStaleVerifiedDirtyEntries,
  getGestionaleDirtySnapshot,
  markGestionaleDirty,
  resetGestionaleDirtyStateForTests,
} from "@/lib/sync/gestionale-dirty-state";
import { resetGestionaleDirtyPersistForTests } from "@/lib/sync/gestionale-dirty-persist";
import { recoverGestionaleDirtyOnResume } from "@/lib/sync/gestionale-dirty-resume";
import { resetCheckRemoteRevisionsForTests } from "@/lib/sync/check-remote-revisions";
import {
  clearGestionaleSyncScopesForTests,
  registerGestionaleSyncScope,
} from "@/lib/sync/gestionale-sync-scope";
import {
  resetOperationalVersionStateForTests,
  setFetchOperationalTableVersionsForTests,
} from "@/lib/sync/operational-data-version";
import { resetOperationalSessionWarmupForTests } from "@/lib/sync/operational-session-warmup";

function ensureVisibleDocument(): void {
  if (typeof globalThis.document === "undefined") {
    (globalThis as { document?: { visibilityState: string } }).document = {
      visibilityState: "visible",
    };
  } else {
    Object.defineProperty(globalThis.document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  }
}

async function run(): Promise<void> {
  ensureVisibleDocument();
  clearGestionaleSyncScopesForTests();
  registerGestionaleSyncScope({
    scopeId: "test-lavorazioni",
    domain: "lavorazioni",
    tables: ["lavorazioni"],
  });
  resetGestionaleDirtyStateForTests();
  resetGestionaleDirtyPersistForTests();
  resetOperationalSessionWarmupForTests();
  resetCheckRemoteRevisionsForTests();
  resetOperationalVersionStateForTests({ lavorazioni: 10 });

  markGestionaleDirty({
    domain: "lavorazioni",
    table: "lavorazioni",
    entityId: "lav-1",
    type: "update",
    timestamp: Date.now(),
    source: "realtime",
  });
  assert.equal(getGestionaleDirtySnapshot().entries.size, 1, "realtime dirty without version kept");

  markGestionaleDirty({
    domain: "magazzino",
    table: "magazzino_ricambi",
    entityId: null,
    type: "update",
    timestamp: Date.now(),
    source: "realtime",
    remoteVersion: 100,
  });

  clearStaleVerifiedDirtyEntries({
    serverVersions: { magazzino_ricambi: 100 },
    changedTables: [],
  });
  assert.equal(getGestionaleDirtySnapshot().entries.has("magazzino_ricambi:*"), false);
  assert.equal(getGestionaleDirtySnapshot().entries.has("lavorazioni:lav-1"), true);

  resetGestionaleDirtyStateForTests();
  resetGestionaleDirtyPersistForTests();
  resetOperationalVersionStateForTests({ lavorazioni: 10 });
  setFetchOperationalTableVersionsForTests(async () => ({ lavorazioni: 10 }));

  await recoverGestionaleDirtyOnResume();
  assert.equal(getGestionaleDirtySnapshot().entries.size, 0, "resume without drift must not add dirty");

  resetOperationalVersionStateForTests({ lavorazioni: 10 });
  setFetchOperationalTableVersionsForTests(async () => ({ lavorazioni: 20 }));
  await recoverGestionaleDirtyOnResume();
  assert.ok(
    getGestionaleDirtySnapshot().entries.has("lavorazioni:*"),
    "resume with drift must mark domain dirty",
  );

  resetGestionaleDirtyStateForTests();
  resetGestionaleDirtyPersistForTests();
  resetOperationalVersionStateForTests();
  setFetchOperationalTableVersionsForTests(null);
  resetCheckRemoteRevisionsForTests();
  resetOperationalSessionWarmupForTests();
  clearGestionaleSyncScopesForTests();
}

void run().then(() => {
  console.log("gestionale-dirty-resume.test.ts OK");
});
