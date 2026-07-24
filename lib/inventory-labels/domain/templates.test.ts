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
assert.equal(a4!.widthMm, 287);
assert.equal(a4!.heightMm, 200);
assert.equal(labelsPerA4Page(a4!), 1);
assert.equal(a4!.layoutMode, "horizontal-qr-left");
assert.equal(a4!.version, "2.1.0");
const a4Qr = a4!.elements.find((e) => e.type === "qr");
const a4Logo = a4!.elements.find((e) => e.type === "logo");
const a4Barcode = a4!.elements.find((e) => e.type === "barcode");
const a4Marca = a4!.elements.find((e) => e.type === "text" && e.field === "marca");
assert.ok(a4Qr && a4Qr.type === "qr");
assert.ok(a4Logo && a4Logo.type === "logo");
assert.ok(a4Barcode && a4Barcode.type === "barcode");
assert.ok(a4Marca && a4Marca.type === "text");
assert.equal(a4Qr.sizeMm, 58, "A4: QR leggermente ridotto");
assert.equal(a4Qr.xMm, a4!.marginsMm, "A4: QR a sinistra");
assert.ok(a4Qr.yMm + a4Qr.sizeMm <= a4!.heightMm - a4!.marginsMm + 0.01, "A4: QR ancorato in basso a sinistra");
assert.equal(a4Logo.widthMm, a4Qr.sizeMm, "A4: logo stessa larghezza del QR");
assert.ok(a4Logo.yMm + a4Logo.heightMm <= a4Qr.yMm, "A4: logo sopra il QR");
assert.equal(a4Marca.xMm, a4!.marginsMm, "A4: testi a tutta larghezza");
assert.equal(a4Marca.maxWidthMm, a4!.widthMm - a4!.marginsMm * 2);
assert.ok(a4Marca.fontPt >= 38, "A4: font grande per lettura a distanza");
assert.ok(a4Barcode.xMm > a4!.marginsMm + a4Qr.sizeMm, "A4: barcode a destra del QR");
assert.ok(a4Barcode.widthMm! > a4Qr.sizeMm, "A4: barcode usa la fascia destra");

const cliente = getLabelTemplate("95x40-default", "cliente");
assert.ok(cliente);
assert.equal(cliente!.id, "95x40-default-cliente");
assert.ok(cliente!.elements.some((e) => e.type === "logo"));
assert.ok(!cliente!.elements.some((e) => e.type === "barcode"));
assert.ok(!cliente!.elements.some((e) => e.type === "text" && e.field === "codiceSecondario"));
const clienteQr = cliente!.elements.find((e) => e.type === "qr");
assert.ok(clienteQr && clienteQr.type === "qr");
assert.ok(clienteQr.sizeMm >= cliente!.heightMm - cliente!.marginsMm * 2 - 0.5);

console.log("inventory-labels/domain/templates.test.ts OK");
