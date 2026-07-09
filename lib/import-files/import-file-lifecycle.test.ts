import assert from "node:assert/strict";
import {
  assertImportFileTransition,
  canImportFileTransition,
} from "@/lib/import-files/import-file-state-machine.server";

assert.equal(canImportFileTransition("uploaded", "processing"), true);
assert.equal(canImportFileTransition("uploaded", "cancelled"), true);
assert.equal(canImportFileTransition("cancelled", "expired"), true);
assert.equal(canImportFileTransition("processed", "processing"), false);

assert.throws(() => assertImportFileTransition("processed", "processing"));

console.log("import-file-lifecycle.test.ts OK");
