import assert from "node:assert/strict";
import {
  clearExplicitSaveAttempts,
  recordExplicitSaveAttempt,
  resetSaveOperationLoopGuardForTests,
  SaveOperationLoopError,
  SAVE_OPERATION_LOOP_MESSAGE,
} from "@/lib/sync/save-operation-loop-guard";

function run() {
  resetSaveOperationLoopGuardForTests();

  for (let i = 0; i < 5; i += 1) {
    recordExplicitSaveAttempt("scheda_ingresso", "lav-1");
  }

  assert.throws(
    () => recordExplicitSaveAttempt("scheda_ingresso", "lav-1"),
    (err: unknown) => {
      assert.ok(err instanceof SaveOperationLoopError);
      assert.equal(err.message, SAVE_OPERATION_LOOP_MESSAGE);
      assert.equal(err.meta?.attemptCount, 6);
      return true;
    },
  );

  clearExplicitSaveAttempts("scheda_ingresso", "lav-1");
  assert.doesNotThrow(() => recordExplicitSaveAttempt("scheda_ingresso", "lav-1"));

  resetSaveOperationLoopGuardForTests();
  recordExplicitSaveAttempt("mezzo_catalog", "m-1");
  recordExplicitSaveAttempt("scheda_ingresso", "lav-2");
  assert.doesNotThrow(() => recordExplicitSaveAttempt("mezzo_catalog", "m-1"));

  console.log("save-operation-loop-guard.test.ts OK");
}

run();
