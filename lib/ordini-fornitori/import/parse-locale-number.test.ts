import assert from "node:assert/strict";
import { parseLocaleNumber } from "@/lib/ordini-fornitori/import/parse-locale-number";

assert.equal(parseLocaleNumber("1.234,56"), 1234.56);
assert.equal(parseLocaleNumber("1,234.56"), 1234.56);
assert.equal(parseLocaleNumber("12,5"), 12.5);
assert.equal(parseLocaleNumber("12.5"), 12.5);
assert.equal(parseLocaleNumber("22%"), 22);
assert.equal(parseLocaleNumber("€ 100,00"), 100);
assert.equal(parseLocaleNumber(-5), -5);
assert.equal(parseLocaleNumber("abc"), null);
assert.equal(parseLocaleNumber("10", { min: 0, max: 5 }), null);
assert.equal(parseLocaleNumber("3,141", { decimals: 2 }), 3.14);

console.log("parse-locale-number.test.ts OK");
