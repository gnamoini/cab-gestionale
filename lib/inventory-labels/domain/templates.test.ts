import assert from "node:assert/strict";
import { getLabelTemplate, labelMarginMm } from "@/lib/inventory-labels/domain/templates";
import { labelsPerA4Page } from "@/lib/inventory-labels/render/print-layout";

const t = getLabelTemplate("60x40-default");
assert.ok(t);
assert.equal(t!.version, "2.0.0");

const qr = t!.elements.find((e) => e.type === "qr");
const marca = t!.elements.find((e) => e.type === "text" && e.field === "marca");
const desc = t!.elements.find((e) => e.type === "text" && e.field === "descrizione");
const codice = t!.elements.find((e) => e.type === "text" && e.field === "codice");
const marca2 = t!.elements.find((e) => e.type === "text" && e.field === "marcaSecondaria");
const codice2 = t!.elements.find((e) => e.type === "text" && e.field === "codiceSecondario");
const altForn = t!.elements.find((e) => e.type === "text" && e.field === "fornitoreAlternativo");
assert.ok(qr && qr.type === "qr");
assert.ok(marca && marca.type === "text");
assert.ok(desc && desc.type === "text" && desc.zoneBottomMm != null);
assert.ok(codice && codice.type === "text" && codice.zoneBottomMm != null);
assert.ok(marca2 && marca2.type === "text");
assert.ok(codice2 && codice2.type === "text");
assert.ok(altForn && altForn.type === "text" && altForn.zoneBottomMm != null);
assert.ok(!t!.elements.some((e) => (e as { type: string }).type === "barcode"), "no barcode element");

const m = labelMarginMm(60, 40);
const labelBottom = t!.heightMm - m;
assert.equal(qr.yMm, m, "QR top al margine");
assert.equal(qr.xMm, m, "QR left al margine");
assert.equal(marca.yMm, m, "marca top al margine");
assert.equal(altForn.zoneBottomMm, labelBottom, "fornitore alt ancorato al fondo etichetta");
assert.ok(Math.abs(qr.yMm + qr.sizeMm - labelBottom) < 0.05, "QR full-height tra i margini");

assert.ok(codice.xMm > m + qr.sizeMm);
assert.equal(marca.fontPt, desc.fontPt, "template: gruppo alto stessa dimensione");
assert.equal(desc.fontPt, codice.fontPt, "template: gruppo alto stessa dimensione");
assert.ok(altForn.fontPt <= desc.fontPt);

const preferred = getLabelTemplate("100x36-default");
assert.ok(preferred);
assert.equal(preferred!.widthMm, 100);
assert.equal(preferred!.heightMm, 36);
const preferredQr = preferred!.elements.find((e) => e.type === "qr");
assert.ok(preferredQr && preferredQr.type === "qr");
assert.ok(Math.abs(preferredQr.sizeMm - (36 - labelMarginMm(100, 36) * 2)) < 0.05, "100x36: QR full-height");
assert.ok(labelsPerA4Page(preferred!) >= 14, "100×36: 2 colonne × 7 righe su A4");

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
assert.equal(a4!.version, "2.3.0");
const a4Qr = a4!.elements.find((e) => e.type === "qr");
const a4Marca = a4!.elements.find((e) => e.type === "text" && e.field === "marca");
assert.ok(a4Qr && a4Qr.type === "qr");
assert.ok(a4Marca && a4Marca.type === "text");
assert.ok(!a4!.elements.some((e) => e.type === "logo"), "A4 interno: no logo CAB");
assert.equal(a4Qr.sizeMm, 46.4, "A4: QR ridotto 20%");
assert.equal(a4Qr.xMm, (a4!.widthMm - a4Qr.sizeMm) / 2, "A4: QR centrato");
assert.ok(a4Qr.yMm + a4Qr.sizeMm <= a4!.heightMm - a4!.marginsMm + 0.01, "A4: QR ancorato in basso");
assert.equal(a4Marca.xMm, a4!.widthMm / 2, "A4: testi centrati");
assert.equal(a4Marca.hAlign, "center");
assert.equal(a4Marca.vAlign, "center");
assert.equal(a4Marca.maxWidthMm, a4!.widthMm - a4!.marginsMm * 2 - 2, "A4: inset laterale testo");
assert.ok(a4Marca.fontPt >= 52, "A4: font grande per lettura a distanza");
assert.ok(!a4!.elements.some((e) => (e as { type: string }).type === "barcode"), "A4: no barcode");

const cliente = getLabelTemplate("95x40-default", "cliente");
assert.ok(cliente);
assert.equal(cliente!.id, "95x40-default-cliente");
assert.ok(cliente!.elements.some((e) => e.type === "logo"));
assert.ok(!cliente!.elements.some((e) => (e as { type: string }).type === "barcode"));
assert.ok(!cliente!.elements.some((e) => e.type === "text" && e.field === "codiceSecondario"));
const clienteQr = cliente!.elements.find((e) => e.type === "qr");
assert.ok(clienteQr && clienteQr.type === "qr");
const clienteWebsite = cliente!.elements.find(
  (e) => e.type === "text" && e.literalSource === "clienteWebsite",
);
assert.ok(clienteWebsite && clienteWebsite.type === "text");
assert.ok(clienteQr.sizeMm < cliente!.heightMm - cliente!.marginsMm * 2 - 0.5, "cliente: QR ridotto per sito");
assert.ok(
  clienteWebsite.yMm >= clienteQr.yMm + clienteQr.sizeMm - 0.01,
  "cliente: sito sotto il QR",
);
assert.equal(clienteWebsite.xMm, clienteQr.xMm + clienteQr.sizeMm / 2, "cliente: sito centrato sul QR");
assert.equal(clienteWebsite.hAlign, "center");

const manual = getLabelTemplate("95x40-default", "manual");
assert.ok(manual);
assert.equal(manual!.id, "95x40-default-manual");
assert.equal(manual!.layoutMode, "manual-centered");
assert.ok(!manual!.elements.some((e) => e.type === "qr"));
assert.ok(!manual!.elements.some((e) => (e as { type: string }).type === "barcode"));
assert.ok(manual!.elements.some((e) => e.type === "logo"));
const manualMarca = manual!.elements.find((e) => e.type === "text" && e.field === "marca");
assert.ok(manualMarca && manualMarca.type === "text");
assert.equal(manualMarca.hAlign, "center");
assert.equal(manualMarca.vAlign, "center");
assert.equal(getLabelTemplate("a4-pagina-intera", "manual"), null);

console.log("inventory-labels/domain/templates.test.ts OK");
