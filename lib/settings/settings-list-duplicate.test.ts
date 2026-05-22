import assert from "node:assert/strict";
import {
  findExactSettingsDuplicate,
  findSimilarSettingsDuplicate,
  isBlockingExactDuplicate,
} from "./settings-list-duplicate";

const pool = ["CEMA", "CEMA SRL", "Fiat", "Iveco"];

assert.equal(findExactSettingsDuplicate(pool, "cema"), "CEMA");
assert.equal(findExactSettingsDuplicate(pool, "CEMA SRL", "CEMA"), "CEMA SRL");
assert.equal(findExactSettingsDuplicate(pool, "cema", "CEMA"), null);

assert.equal(isBlockingExactDuplicate(pool, "Cema"), true);
assert.equal(isBlockingExactDuplicate(pool, "Nuovo"), false);

const similar = findSimilarSettingsDuplicate(pool, "Ce.Ma.");
assert.ok(similar === "CEMA" || similar === "CEMA SRL");

const similarSrl = findSimilarSettingsDuplicate(pool, "Cema srl");
assert.ok(similarSrl != null);

console.log("settings-list-duplicate.test.ts OK");
