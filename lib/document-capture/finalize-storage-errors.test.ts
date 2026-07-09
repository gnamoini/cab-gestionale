import assert from "node:assert/strict";
import {
  classifyFinalizeStorageDownloadError,
  finalizeStorageErrorToDocumentCaptureCode,
} from "../document-capture/finalize-storage-errors";
import { classifyStorageDownloadError } from "../storage/storage-download-errors";

const policyErr = classifyFinalizeStorageDownloadError(
  { message: "new row violates row-level security policy" },
  false,
);
assert.equal(policyErr.code, "STORAGE_PERMISSION_DENIED");
assert.equal(policyErr.isPolicyError, true);
assert.match(policyErr.message, /finalizzazione/);

const shared = classifyStorageDownloadError(
  { message: "Object not found" },
  false,
  "documenti",
  "import ordine",
);
assert.equal(shared.code, "STORAGE_NOT_FOUND");

const notFoundErr = classifyFinalizeStorageDownloadError(
  { message: "Object not found" },
  false,
);
assert.equal(notFoundErr.code, "STORAGE_NOT_FOUND");
assert.match(notFoundErr.message, /path atteso/);

const emptyErr = classifyFinalizeStorageDownloadError(null, false);
assert.equal(emptyErr.code, "STORAGE_EMPTY");

assert.equal(
  finalizeStorageErrorToDocumentCaptureCode("STORAGE_NOT_FOUND"),
  "STORAGE_NOT_FOUND",
);

console.log("finalize-storage-errors.test.ts OK");
