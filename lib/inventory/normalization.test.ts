import assert from "node:assert/strict";
import {
  normalizeItemCode,
  normalizeItemCodeLoose,
  normalizeItemDescription,
} from "@/lib/inventory/normalization";

assert.equal(normalizeItemCode("ABC-001"), "ABC001");
assert.equal(normalizeItemCode("abc/001"), "ABC001");
assert.equal(normalizeItemCodeLoose("000123"), "123");
assert.equal(normalizeItemCodeLoose("ABC-0001"), "ABC1");
assert.equal(normalizeItemDescription("  Filtro   Olio  "), "filtro olio");

console.log("normalization.test.ts OK");
