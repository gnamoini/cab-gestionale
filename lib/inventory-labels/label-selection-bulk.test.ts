import assert from "node:assert/strict";
import {
  computeLabelSelection,
  clampLabelQuantity,
  labelQuantitiesToCompactItems,
} from "@/lib/inventory-labels/client/label-selection";
import { expandLabelItemsForRender } from "@/lib/inventory-labels/domain/bulk-items";
import { resolveSupplierBlock } from "@/lib/inventory-labels/domain/label-suppliers";
import { getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { labelsPerA4Page } from "@/lib/inventory-labels/render/print-layout";
import { GENERATOR_VERSION } from "@/lib/inventory-labels/domain/types";
import { computeLabelFingerprint } from "@/lib/inventory-labels/domain/fingerprints";

assert.equal(clampLabelQuantity(0), 0);
assert.equal(clampLabelQuantity(99), 99);
assert.equal(clampLabelQuantity(100), 99);

const selection = computeLabelSelection({ a: 3, b: 0, c: 2 });
assert.equal(selection.totalLabels, 5);
assert.equal(selection.totalItems, 2);
assert.equal(selection.hasSelection, true);

const compact = labelQuantitiesToCompactItems({ a: 3, b: 0 });
assert.deepEqual(compact, [{ id: "a", quantity: 3 }]);

const expanded = expandLabelItemsForRender(
  [{ id: "a", quantity: 3 }, { id: "b", quantity: 1 }],
  (id) => (id === "a" || id === "b" ? { id } : undefined),
);
assert.deepEqual(expanded.map((x) => x.id), ["a", "a", "a", "b"]);

const suppliers = resolveSupplierBlock(
  [
    { name: "STIS", code: "ABC" },
    { name: "LINEA STRADALE", code: "XYZ" },
  ],
  "inline-slash",
);
assert.equal(suppliers.fornitoreLines[0], "STIS / LINEA STRADALE");
assert.equal(suppliers.codiceLines[0], "ABC / XYZ");

const a4 = getLabelTemplate("a4-pagina-intera")!;
assert.equal(labelsPerA4Page(a4), 1);
assert.equal(a4.layoutMode, "horizontal-qr-left");
assert.equal(a4.typography.weight, "bold");

const template = getLabelTemplate("95x40-default")!;
const itemPayload = {
  marca: "BTE",
  marcaSecondaria: "",
  descrizione: "Test",
  codice: "ABC",
  codiceSecondario: "",
  fornitoriAlternativi: [],
  fornitoreAlternativo: "",
  codiceAlternativo: "",
};
const fp1 = computeLabelFingerprint({
  payload: itemPayload,
  templateId: template.id,
  templateVersion: template.version,
  generatorVersion: GENERATOR_VERSION,
  preset: template.id,
  includeBarcode: false,
  canonicalOrigin: "https://example.test",
});
const fp2 = computeLabelFingerprint({
  payload: itemPayload,
  templateId: template.id,
  templateVersion: "9.9.9",
  generatorVersion: GENERATOR_VERSION,
  preset: template.id,
  includeBarcode: false,
  canonicalOrigin: "https://example.test",
});
assert.notEqual(fp1, fp2, "template version bump invalidates cache");

const expanded50 = expandLabelItemsForRender(
  [{ id: "x", quantity: 50 }],
  () => ({ id: "x" }),
);
assert.equal(expanded50.length, 50);

console.log("inventory-labels/label-selection-bulk.test.ts OK");
