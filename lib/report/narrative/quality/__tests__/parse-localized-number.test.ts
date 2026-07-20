import assert from "node:assert/strict";
import { parseLocalizedNumber } from "@/lib/report/narrative/quality/parse-localized-number";

assert.equal(parseLocalizedNumber("10.98"), 10.98);
assert.equal(parseLocalizedNumber("10,98"), 10.98);
assert.equal(parseLocalizedNumber("1.250,50"), 1250.5);
assert.equal(parseLocalizedNumber("1.250"), 1250);
assert.equal(parseLocalizedNumber("11"), 11);

console.log("parse-localized-number.test.ts OK");
