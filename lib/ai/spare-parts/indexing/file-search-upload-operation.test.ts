import assert from "node:assert/strict";
import {
  computeFileSearchUploadTimeoutMs,
  extractFileSearchUploadFileName,
  isFileSearchUploadComplete,
} from "./file-search-upload-operation";

assert.equal(isFileSearchUploadComplete({ done: true }), true);
assert.equal(isFileSearchUploadComplete({ response: { documentName: "fileSearchStores/x/doc" } }), true);
assert.equal(isFileSearchUploadComplete({ name: "operations/abc" }), false);

assert.equal(
  extractFileSearchUploadFileName({ response: { documentName: "fileSearchStores/store/docs/1" } }),
  "fileSearchStores/store/docs/1",
);

assert.equal(computeFileSearchUploadTimeoutMs(2 * 1024 * 1024, 600_000), 300_000);
assert.equal(computeFileSearchUploadTimeoutMs(50 * 1024 * 1024, 300_000), 300_000);

console.log("file-search-upload-operation.test.ts ok");
