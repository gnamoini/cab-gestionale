import assert from "node:assert/strict";
import {
  computeLabelLayout,
  fontLineHeightMm,
  getLabelTemplate,
  labelMarginMm,
} from "@/lib/inventory-labels/domain/templates";
import { labelsPerA4Page } from "@/lib/inventory-labels/render/print-layout";

const t = getLabelTemplate("60x40-default");
assert.ok(t);
assert.equal(t!.version, "1.4.11");

const qr = t!.elements.find((e) => e.type === "qr");
const marca = t!.elements.find((e) => e.type === "text" && e.field === "marca");
const desc = t!.elements.find((e) => e.type === "text" && e.field === "descrizione");
const codice = t!.elements.find((e) => e.type === "text" && e.field === "codice");
const altForn = t!.elements.find((e) => e.type === "text" && e.field === "fornitoreAlternativo");
const barcode = t!.elements.find((e) => e.type === "barcode");
assert.ok(qr && qr.type === "qr");
assert.ok(marca && marca.type === "text");
assert.ok(desc && desc.type === "text" && desc.zoneBottomMm != null);
assert.ok(codice && codice.type === "text" && codice.zoneBottomMm != null);
assert.ok(altForn && altForn.type === "text");
assert.ok(barcode && barcode.type === "barcode");

const m = labelMarginMm(60, 40);
assert.equal(qr.yMm, m, "QR top allineato al margine/marca");
assert.equal(qr.xMm, m, "QR left allineato al barcode");
assert.equal(barcode.xMm, m, "barcode left al margine");
assert.equal(marca.yMm, m, "marca top al margine");
const contentBottom = barcode.yMm - 0.6;
assert.ok(qr.yMm + qr.sizeMm <= contentBottom - 1, "QR non arriva al barcode");
assert.ok(qr.sizeMm >= contentBottom - m - 1.5 - 0.5, `QR ridotto con inset, got ${qr.sizeMm}`);

assert.ok(codice.xMm > m + qr.sizeMm);
assert.ok(altForn.fontPt < desc.fontPt);

const perPage = labelsPerA4Page(t!);
assert.ok(perPage >= 4);

console.log("inventory-labels/domain/templates.test.ts OK");
