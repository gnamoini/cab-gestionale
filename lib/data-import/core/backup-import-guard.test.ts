import assert from "node:assert/strict";
import {
  assertBackupImportAllowed,
  computeManifestHash,
  ImportValidationError,
} from "@/lib/data-import/core/backup-import-policy";

let threw = false;
try {
  assertBackupImportAllowed({ exportMode: "backup" }, "parse");
} catch (e) {
  threw = true;
  assert.ok(e instanceof ImportValidationError);
  assert.match((e as ImportValidationError).message, /backup/i);
}
assert.ok(threw, "backup must throw");

assert.doesNotThrow(() => assertBackupImportAllowed({ exportMode: "importable" }, "execute"));

const h1 = computeManifestHash({
  sheetNames: ["Mezzi", "_meta"],
  columnKeys: ["targa", "cliente"],
  exportMode: "backup",
  templateVersion: "2.0",
});
const h2 = computeManifestHash({
  sheetNames: ["Mezzi", "_meta"],
  columnKeys: ["targa", "cliente"],
  exportMode: "importable",
  templateVersion: "2.0",
});
assert.notEqual(h1, h2);

console.log("backup-import-guard.test.ts OK");
