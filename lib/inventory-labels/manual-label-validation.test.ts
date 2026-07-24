import assert from "node:assert/strict";
import { manualLabelRenderSchema } from "@/lib/inventory-labels/validation";

const empty = manualLabelRenderSchema.safeParse({
  marca: "",
  descrizione: "",
  codice: "",
});
assert.equal(empty.success, false);

const codiceOnly = manualLabelRenderSchema.safeParse({ codice: "ABC-123" });
assert.equal(codiceOnly.success, true);
if (codiceOnly.success) {
  assert.equal(codiceOnly.data.codice, "ABC-123");
  assert.equal(codiceOnly.data.format, "png");
}

const trimmed = manualLabelRenderSchema.safeParse({
  marca: "  BTE  ",
  descrizione: " Sensore ",
  codice: " X1 ",
});
assert.equal(trimmed.success, true);
if (trimmed.success) {
  assert.equal(trimmed.data.marca, "BTE");
  assert.equal(trimmed.data.descrizione, "Sensore");
  assert.equal(trimmed.data.codice, "X1");
}

const invalidPreset = manualLabelRenderSchema.safeParse({
  codice: "X",
  preset: "a4-pagina-intera",
});
assert.equal(invalidPreset.success, false);

console.log("inventory-labels/manual-label-validation.test.ts OK");
