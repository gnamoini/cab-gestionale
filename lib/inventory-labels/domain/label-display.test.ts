import assert from "node:assert/strict";
import {
  formatLabelCodiceLine,
  formatLabelMarcaLine,
  formatLabelMarcaSecondariaLine,
  labelDisplayCaps,
  labelMarcaToken,
  shouldRenderMarcaSecondaria,
} from "@/lib/inventory-labels/domain/label-display";

assert.equal(labelDisplayCaps("filtro olio"), "FILTRO OLIO");
assert.equal(formatLabelMarcaLine("bte", "omb"), "BTE");
assert.equal(formatLabelMarcaSecondariaLine("omb"), "OMB");
assert.equal(formatLabelMarcaLine("BTE", ""), "BTE");
assert.equal(formatLabelMarcaLine("", "OMB"), "");
assert.equal(formatLabelMarcaLine("—", "OMB"), "");
assert.equal(formatLabelCodiceLine("8FSNS030000001", "BTE"), "8FSNS030000001 (BTE)");
assert.equal(formatLabelCodiceLine("ABC", ""), "ABC");
assert.equal(labelMarcaToken("Nessuna marca"), "");

assert.equal(
  shouldRenderMarcaSecondaria({ marca: "BTE", marcaSecondaria: "OMB", fornitoreAlternativo: "" }),
  true,
);
assert.equal(
  shouldRenderMarcaSecondaria({ marca: "BTE", marcaSecondaria: "BTE", fornitoreAlternativo: "" }),
  false,
);
assert.equal(
  shouldRenderMarcaSecondaria({ marca: "BTE", marcaSecondaria: "Bosch", fornitoreAlternativo: "Bosch" }),
  false,
);

console.log("inventory-labels/domain/label-display.test.ts OK");
