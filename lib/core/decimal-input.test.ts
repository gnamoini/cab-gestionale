import assert from "node:assert/strict";
import {
  isDecimalInputDraft,
  normalizeDecimalInput,
  parseDecimalInput,
} from "@/lib/core/decimal-input";

assert.equal(isDecimalInputDraft(""), true);
assert.equal(isDecimalInputDraft("12,5"), true);
assert.equal(isDecimalInputDraft("12.5"), true);
assert.equal(isDecimalInputDraft("12,"), true);
assert.equal(isDecimalInputDraft("abc"), false);
assert.equal(isDecimalInputDraft("12,5,6"), false);

assert.equal(normalizeDecimalInput(" 12,5 "), "12.5");
assert.equal(parseDecimalInput("1234,5"), 1234.5);
assert.equal(parseDecimalInput("1234.5"), 1234.5);
assert.equal(parseDecimalInput(""), null);
assert.equal(parseDecimalInput("abc"), null);

console.log("decimal-input.test.ts OK");
