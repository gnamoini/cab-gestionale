import assert from "node:assert/strict";
import {
  httpStatusForOrdineFornitoreImportError,
  isOrdineFornitoreImportErrorCode,
} from "./ordine-fornitore-import-error-codes";
import { OrdineFornitoreImportAnalyzeError } from "./ordine-fornitore-import-analyze-error";

assert.equal(httpStatusForOrdineFornitoreImportError("NOT_CONFIGURED"), 503);
assert.equal(httpStatusForOrdineFornitoreImportError("STORAGE_PERMISSION_DENIED"), 403);
assert.equal(httpStatusForOrdineFornitoreImportError("DOCUMENT_NOT_FOUND"), 404);
assert.equal(httpStatusForOrdineFornitoreImportError("AI_GENERATION_FAILED"), 502);

const err = new OrdineFornitoreImportAnalyzeError("STORAGE_NOT_FOUND", "test", {
  storagePath: "blobs/ab/cd",
  bucket: "documenti",
  storageErrorCode: "STORAGE_NOT_FOUND",
});
assert.equal(err.code, "STORAGE_NOT_FOUND");
assert.equal(err.storagePath, "blobs/ab/cd");
assert.ok(isOrdineFornitoreImportErrorCode("RATE_LIMITED"));

console.log("ordine-fornitore-import-error-codes.test.ts OK");
