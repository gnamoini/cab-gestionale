import assert from "node:assert/strict";
import { getLabelTemplate, labelMarginMm } from "@/lib/inventory-labels/domain/templates";
import { linesFitDisplayWidth, linesFitWrapWidth } from "@/lib/inventory-labels/render/layout";
import { resolveLabelTextLayout } from "@/lib/inventory-labels/render/text-layout";
import {
  blockHeightMm,
  capHeightMm,
  lineMetrics,
  nextRowBaselineMm,
  stackBottomMmFrom,
  supplierCapBaselineMm,
} from "@/lib/inventory-labels/render/text-metrics";

const template = getLabelTemplate("60x40-default")!;
const marcaEl = template.elements.find((e) => e.type === "text" && e.field === "marca")!;
const descEl = template.elements.find((e) => e.type === "text" && e.field === "descrizione")!;
const codiceEl = template.elements.find((e) => e.type === "text" && e.field === "codice")!;
const altFornEl = template.elements.find((e) => e.type === "text" && e.field === "fornitoreAlternativo")!;
const barcode = template.elements.find((e) => e.type === "barcode")!;
assert.ok(codiceEl && codiceEl.type === "text" && codiceEl.zoneBottomMm != null);
assert.ok(altFornEl && altFornEl.type === "text");
assert.ok(barcode && barcode.type === "barcode");

const labelBottom = altFornEl.zoneBottomMm!;
const topGroupBottom = codiceEl.zoneBottomMm!;

const payload = {
  marca: "BTE",
  marcaSecondaria: "",
  descrizione:
    "Filtro olio motore ad alte prestazioni per veicoli commerciali pesanti e industriali",
  codice: "8FSNS030000001",
  codiceSecondario: "",
  fornitoreAlternativo: "Ricambi Express",
  codiceAlternativo: "RX-90812",
};

const placed = resolveLabelTextLayout(template, payload);
const marca = placed.find((p) => p.field === "marca")!;
const desc = placed.find((p) => p.field === "descrizione")!;
const codice = placed.find((p) => p.field === "codice")!;
const altForn = placed.find((p) => p.field === "fornitoreAlternativo")!;
const altCod = placed.find((p) => p.field === "codiceAlternativo")!;

assert.equal(marca.fontPt, marcaEl.fontPt, "marca: font solo da template");
assert.equal(desc.fontPt, descEl.fontPt, "descrizione: font solo da template");
assert.equal(codice.fontPt, codiceEl.fontPt, "codice: font solo da template");
assert.ok(linesFitWrapWidth(desc.lines, codiceEl.maxWidthMm ?? 20, desc.fontPt));
assert.equal(marca.lines.join(""), "BTE");
assert.ok(linesFitDisplayWidth(codice.lines, codiceEl.maxWidthMm ?? 20, codice.fontPt, "mono"));
assert.ok(codice.lines.join("").length > 0, "codice presente");
assert.ok(codice.fontPt === codiceEl.fontPt, `codice font da template: ${codice.fontPt}`);
const rowStep = lineMetrics(desc.fontPt, template.dpi).lineStepMm;
assert.ok(codice.yMm > desc.yMm, "codice sotto descrizione nel gruppo alto");
const descToCodiceGap =
  codice.yMm -
  nextRowBaselineMm(desc.yMm, desc.lines.length, desc.fontPt, rowStep, template.dpi);
assert.ok(Math.abs(descToCodiceGap - 0.4) < 0.02, "extra spazio descrizione→codice nel gruppo alto");
assert.ok(altForn.lines.join(" ").includes("RICAMBI"));
assert.ok(altCod.lines.join(" ").includes("RX-90812"));
assert.ok(altForn.yMm > codice.yMm, "gruppo basso sotto gruppo alto");
assert.ok(altCod.yMm > altForn.yMm, "codice alt sotto fornitore nel gruppo basso");
assert.ok(altForn.fontPt <= desc.fontPt, "gruppo basso non più grande del gruppo alto");
const barcodeBottom = barcode.yMm + barcode.heightMm;
const expectedAltBaseline = supplierCapBaselineMm(barcodeBottom, altCod.fontPt, template.dpi);
assert.equal(altCod.baseline, "alphabetic", "codice alt su baseline");
assert.ok(Math.abs(altCod.yMm - expectedAltBaseline) < 0.08, "baseline codice alt alzata sul fondo barcode");
assert.ok(altCod.yMm < barcodeBottom, "codice alt non oltre il fondo barcode");
assert.ok(altForn.yMm >= barcode.yMm - 0.15, "fornitore nella fascia barcode");

const dual = resolveLabelTextLayout(template, {
  marca: "BTE",
  marcaSecondaria: "OMB",
  descrizione: "Sensore",
  codice: "XXXX",
  codiceSecondario: "YYYY",
  fornitoreAlternativo: "Forn",
  codiceAlternativo: "ALT-1",
});
const dualMarca = dual.find((p) => p.field === "marca")!;
const dualCodice = dual.find((p) => p.field === "codice")!;
const dualCodice2 = dual.find((p) => p.field === "codiceSecondario")!;
assert.ok(dualMarca.lines.join(" ").replace(/\s+/g, " ").includes("BTE / OMB"));
assert.ok(dualCodice.lines.join("").includes("XXXX"));
assert.ok(dualCodice2.lines.join("").includes("YYYY"));
assert.ok(dualCodice2.yMm > dualCodice.yMm, "codice secondario sotto principale");

const m12 = resolveLabelTextLayout(template, {
  marca: "BTE",
  marcaSecondaria: "",
  descrizione: "Sensore fotoelettrico M12",
  codice: "ABC",
  codiceSecondario: "",
  fornitoreAlternativo: "",
  codiceAlternativo: "",
});
const m12desc = m12.find((p) => p.field === "descrizione")!;
const textW = marcaEl.maxWidthMm ?? 24.5;
assert.ok(linesFitWrapWidth(m12desc.lines, textW, m12desc.fontPt));
assert.ok(
  !m12desc.lines.some((l) => l.includes("fotoelettrico M12")),
  `M12 non sulla stessa riga di fotoelettrico: ${JSON.stringify(m12desc.lines)}`,
);

assert.ok(m12desc.fontPt === descEl.fontPt, "font fisso da template");

const wide = getLabelTemplate("80x40-default")!;
const widePlaced = resolveLabelTextLayout(wide, {
  marca: "BTE",
  marcaSecondaria: "OMB",
  descrizione: "Filtro olio",
  codice: "ABC123",
  codiceSecondario: "",
  fornitoreAlternativo: "Ricambi",
  codiceAlternativo: "RX-1",
});
const wideCodice = widePlaced.find((p) => p.field === "codice")!;
const wideCodiceEl = wide.elements.find((e) => e.type === "text" && e.field === "codice")!;
assert.equal(wideCodice.fontPt, wideCodiceEl.fontPt);

const small = getLabelTemplate("40x20-default")!;
const smallPayload = {
  marca: "BTE",
  marcaSecondaria: "OMB",
  descrizione: "Filtro olio motore commerciale",
  codice: "8FSNS030000001",
  codiceSecondario: "YYYYYYYYYY",
  fornitoreAlternativo: "Ricambi Express SRL",
  codiceAlternativo: "RX-90812-ABCDEF",
};
const smallPlaced = resolveLabelTextLayout(small, smallPayload);
const smallW = small.elements.find((e) => e.type === "text" && e.field === "marca")!.maxWidthMm!;
for (const p of smallPlaced) {
  const fits =
    p.field === "codice" || p.field === "codiceSecondario"
      ? linesFitDisplayWidth(p.lines, smallW, p.fontPt, p.font)
      : linesFitWrapWidth(p.lines, smallW, p.fontPt, p.font);
  assert.ok(fits, `${p.field} overflow: ${JSON.stringify(p.lines)} @ ${p.fontPt}pt`);
}
const smallCodice = smallPlaced.find((p) => p.field === "codice")!;
const smallDesc = smallPlaced.find((p) => p.field === "descrizione")!;
assert.ok(smallCodice.lines.length >= 1);
assert.ok(linesFitDisplayWidth(smallCodice.lines, smallW, smallCodice.fontPt, "mono"));
assert.equal(smallDesc.fontPt, small.elements.find((e) => e.type === "text" && e.field === "descrizione")!.fontPt);

console.log("inventory-labels/render/text-layout.test.ts OK");
