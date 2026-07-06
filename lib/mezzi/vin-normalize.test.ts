import assert from "node:assert/strict";
import {
  normalizeVin,
  vinCanonicalEquals,
  canonicalTelaioNumForWrite,
} from "@/lib/mezzi/vin-normalize";

assert.equal(normalizeVin(" ab123 "), "AB123");
assert.equal(normalizeVin("Ab123"), "AB123");
assert.equal(normalizeVin("   "), null);
assert.equal(normalizeVin(null), null);
assert.equal(normalizeVin(""), null);

assert.equal(vinCanonicalEquals(" ab123 ", "AB123"), true);
assert.equal(vinCanonicalEquals("x", "y"), false);

assert.equal(canonicalTelaioNumForWrite(" ab "), "AB");
assert.equal(canonicalTelaioNumForWrite("", { clearWhenEmpty: true }), null);
assert.equal(canonicalTelaioNumForWrite(undefined), undefined);

console.log("vin-normalize.test.ts OK");
