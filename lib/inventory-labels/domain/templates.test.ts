import assert from "node:assert/strict";
import {
  computeLabelLayout,
  getLabelTemplate,
  labelMarginMm,
} from "@/lib/inventory-labels/domain/templates";
import { labelsPerA4Page } from "@/lib/inventory-labels/render/print-layout";

const t = getLabelTemplate("60x40-default");
assert.ok(t);
assert.equal(t!.version, "1.7.0");

const qr = t!.elements.find((e) => e.type === "qr");
const marca = t!.elements.find((e) => e.type === "text" && e.field === "marca");
const desc = t!.elements.find((e) => e.type === "text" && e.field === "descrizione");
const codice = t!.elements.find((e) => e.type === "text" && e.field === "codice");
const marca2 = t!.elements.find((e) => e.type === "text" && e.field === "marcaSecondaria");
const codice2 = t!.elements.find((e) => e.type === "text" && e.field === "codiceSecondario");
const altForn = t!.elements.find((e) => e.type === "text" && e.field === "fornitoreAlternativo");
const barcode = t!.elements.find((e) => e.type === "barcode");
assert.ok(qr && qr.type === "qr");
assert.ok(marca && marca.type === "text");
assert.ok(desc && desc.type === "text" && desc.zoneBottomMm != null);
assert.ok(codice && codice.type === "text" && codice.zoneBottomMm != null);
assert.ok(marca2 && marca2.type === "text");
assert.ok(codice2 && codice2.type === "text");
assert.ok(altForn && altForn.type === "text" && altForn.zoneBottomMm != null);
assert.ok(barcode && barcode.type === "barcode");

const m = labelMarginMm(60, 40);
const labelBottom = t!.heightMm - m;
assert.equal(qr.yMm, m, "QR top allineato al margine/marca");
assert.equal(qr.xMm, m, "QR left allineato al barcode");
assert.equal(barcode.xMm, m, "barcode left al margine");
assert.equal(barcode.widthMm, qr.sizeMm, "barcode stessa larghezza del QR");
assert.equal(marca.yMm, m, "marca top al margine");
const topGroupBottom = barcode.yMm - 0.6;
assert.equal(altForn.yMm, barcode.yMm, "fornitore alt nella fascia barcode");
assert.equal(altForn.zoneBottomMm, labelBottom, "fornitore alt ancorato al fondo barcode/etichetta");
assert.ok(qr.yMm + qr.sizeMm <= topGroupBottom - 1, "QR non arriva al barcode");
assert.ok(qr.sizeMm >= topGroupBottom - m - 1.5 - 0.5, `QR ridotto con inset, got ${qr.sizeMm}`);

assert.ok(codice.xMm > m + qr.sizeMm);
assert.equal(marca.fontPt, desc.fontPt, "template: gruppo alto stessa dimensione");
assert.equal(desc.fontPt, codice.fontPt, "template: gruppo alto stessa dimensione");
assert.ok(altForn.fontPt <= desc.fontPt);

const perPage = labelsPerA4Page(t!);
assert.ok(perPage >= 4);

const wide = getLabelTemplate("80x40-default");
assert.ok(wide);
assert.equal(wide!.widthMm, 80);
assert.equal(wide!.heightMm, 40);
assert.ok(labelsPerA4Page(wide!) >= 6);

const xl = getLabelTemplate("95x40-default");
assert.ok(xl);
assert.equal(xl!.widthMm, 95);
assert.equal(xl!.heightMm, 40);
assert.ok(labelsPerA4Page(xl!) >= 6);

const a4 = getLabelTemplate("a4-pagina-intera");
assert.ok(a4);
assert.equal(labelsPerA4Page(a4!), 1);
assert.equal(a4!.layoutMode, "vertical-stack");

console.log("inventory-labels/domain/templates.test.ts OK");
