import assert from "node:assert/strict";
import {
  checkImportFingerprint,
  hashDecisions,
  hashImportFingerprint,
  rememberSuccessfulFingerprint,
} from "@/lib/data-import/core/import-fingerprint";

const base = {
  fileSha256: "abc",
  schemaHash: "def",
  entity: "mezzi" as const,
  importMode: "incremental",
  rowCount: 2,
  decisionsHash: hashDecisions([{ a: 1 }]),
};

const fp1 = hashImportFingerprint(base);
const fp2 = hashImportFingerprint({ ...base, importMode: "initial" });
assert.notEqual(fp1, fp2);

assert.equal(checkImportFingerprint(fp1).status, "new");
rememberSuccessfulFingerprint(fp1, "batch-1", "2026-01-01T00:00:00Z");
const dup = checkImportFingerprint(fp1);
assert.equal(dup.status, "duplicate");
if (dup.status === "duplicate") assert.equal(dup.batchId, "batch-1");

console.log("import-export-prg/fingerprint.test.ts OK");
