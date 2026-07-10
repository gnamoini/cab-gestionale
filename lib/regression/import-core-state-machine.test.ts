import assert from "node:assert/strict";
import {
  canImportExecutionTransition,
  assertImportExecutionTransition,
} from "@/lib/import-core/import-execution-state-machine.server";

assert.equal(canImportExecutionTransition("queued", "processing"), true);
assert.equal(canImportExecutionTransition("queued", "completed"), false);

assert.throws(() => assertImportExecutionTransition("completed", "queued"));

console.log("import-core-state-machine.test.ts OK");
