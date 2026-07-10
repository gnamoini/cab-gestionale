import assert from "node:assert/strict";
import {
  checkImportFingerprint,
  hashDecisions,
  hashImportFingerprint,
  rememberSuccessfulFingerprint,
} from "@/lib/data-import/core/import-fingerprint";

const fp = hashImportFingerprint({
  fileSha256: "file",
  schemaHash: "schema",
  entity: "mezzi",
  importMode: "upsert",
  rowCount: 2,
  decisionsHash: hashDecisions([{ action: "create" }]),
});

assert.equal(checkImportFingerprint(fp).status, "new");
rememberSuccessfulFingerprint(fp, "batch-a", "2026-01-01T00:00:00Z");
const dup = checkImportFingerprint(fp);
assert.equal(dup.status, "duplicate");
if (dup.status === "duplicate") assert.equal(dup.batchId, "batch-a");

console.log("import-fingerprint.test.ts OK");
