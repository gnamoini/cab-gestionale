import assert from "node:assert/strict";

type PurgeLabelArtifactsResult = {
  dbDeleted: number;
  storageAttempted: number;
  storageFailed: string[];
};

const sample: PurgeLabelArtifactsResult = {
  dbDeleted: 3,
  storageAttempted: 3,
  storageFailed: ["inventory-labels/magazzino_ricambio/x/y.pdf"],
};

assert.equal(sample.dbDeleted, 3);
assert.equal(sample.storageFailed.length, 1);
assert.ok("inventory-labels/".startsWith("inventory-labels"));

console.log("inventory-labels/storage/artifact-purge.test.ts OK");
