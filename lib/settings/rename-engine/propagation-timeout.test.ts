import assert from "node:assert/strict";
import {
  RenamePropagationTimeoutError,
  withRenamePropagationTimeout,
} from "@/lib/settings/rename-engine/propagation-timeout";

const slow = new Promise<string>((resolve) => {
  setTimeout(() => resolve("ok"), 50);
});

void (async () => {
  const fast = await withRenamePropagationTimeout(() => Promise.resolve("done"), 500);
  assert.equal(fast, "done");

  try {
    await withRenamePropagationTimeout(() => slow, 5);
    assert.fail("expected timeout");
  } catch (e) {
    assert.ok(e instanceof RenamePropagationTimeoutError);
  }

  console.log("propagation-timeout.test.ts OK");
})();
