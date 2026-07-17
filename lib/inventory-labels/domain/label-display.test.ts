import assert from "node:assert/strict";
import {
  formatLabelCodiceLine,
  formatLabelMarcaLine,
  labelDisplayCaps,
  labelMarcaToken,
} from "@/lib/inventory-labels/domain/label-display";

assert.equal(labelDisplayCaps("filtro olio"), "FILTRO OLIO");
assert.equal(formatLabelMarcaLine("bte", "omb"), "BTE / OMB");
assert.equal(formatLabelMarcaLine("BTE", ""), "BTE");
assert.equal(formatLabelMarcaLine("", "OMB"), "OMB");
assert.equal(formatLabelMarcaLine("—", "OMB"), "OMB");
assert.equal(formatLabelCodiceLine("8FSNS030000001", "BTE"), "8FSNS030000001 (BTE)");
assert.equal(formatLabelCodiceLine("ABC", ""), "ABC");
assert.equal(labelMarcaToken("Nessuna marca"), "");

console.log("inventory-labels/domain/label-display.test.ts OK");
