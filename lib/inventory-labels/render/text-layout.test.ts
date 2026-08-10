import assert from "node:assert/strict";
import type { LabelTemplateDefinition, LabelTemplateElement } from "@/lib/inventory-labels/domain/types";
import { getLabelTemplate, labelMarginMm } from "@/lib/inventory-labels/domain/templates";
import { linesFitDisplayWidth, linesFitWrapWidth } from "@/lib/inventory-labels/render/layout";
import { labelFontSlotFor, linesFitInkWidthMm } from "@/lib/inventory-labels/render/text-paths";
import { resolveLabelTextLayout } from "@/lib/inventory-labels/render/text-layout";
import {
  blockHeightMm,
  capHeightMm,
  lineMetrics,
  nextRowBaselineMm,
  stackBottomMmFrom,
  supplierCapBaselineMm,
} from "@/lib/inventory-labels/render/text-metrics";

type TextEl = Extract<LabelTemplateElement, { type: "text" }>;

function findTextEl(template: LabelTemplateDefinition, field: TextEl["field"]): TextEl {
  const el = template.elements.find((e) => e.type === "text" && e.field === field);
  assert.ok(el?.type === "text", `text element ${field}`);
  return el;
}

const template = getLabelTemplate("60x40-default")!;
const marcaEl = findTextEl(template, "marca");
const descEl = findTextEl(template, "descrizione");
const codiceEl = findTextEl(template, "codice");
const altFornEl = findTextEl(template, "fornitoreAlternativo");
const barcode = template.elements.find((e) => e.type === "barcode")!;
assert.ok(codiceEl.zoneBottomMm != null);
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
  fornitoriAlternativi: [{ name: "Ricambi Express", code: "RX-90812" }],
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
  fornitoriAlternativi: [{ name: "Forn", code: "ALT-1" }],
});
const dualMarca = dual.find((p) => p.field === "marca")!;
const dualCodice = dual.find((p) => p.field === "codice")!;
const dualCodice2 = dual.find((p) => p.field === "codiceSecondario")!;
assert.equal(dualMarca.lines.join(" "), "BTE / OMB", "doppia marca: marche unite sulla prima riga");
assert.ok(!dual.some((p) => p.field === "marcaSecondaria"), "doppia marca: nessuna riga marca secondaria");
assert.ok(dualCodice.lines.join("").includes("XXXX"));
assert.ok(dualCodice.lines.join("").includes("BTE"));
assert.ok(dualCodice2!.lines.join("").includes("YYYY"));
assert.ok(dualCodice2!.lines.join("").includes("OMB"));
assert.ok(dualCodice.yMm > dualMarca.yMm, "codice sotto marca");
assert.ok(dualCodice2!.yMm > dualCodice.yMm, "codice secondario sotto codice principale");

const dual95 = getLabelTemplate("95x40-default")!;
const dual95Placed = resolveLabelTextLayout(dual95, {
  marca: "BTE",
  marcaSecondaria: "OMB",
  descrizione: "Sensore",
  codice: "XXXX",
  codiceSecondario: "YYYY",
  fornitoreAlternativo: "Forn",
  codiceAlternativo: "ALT-1",
  fornitoriAlternativi: [{ name: "Forn", code: "ALT-1" }],
});
const dual95Marca = dual95Placed.find((p) => p.field === "marca")!;
const dual95Codice = dual95Placed.find((p) => p.field === "codice")!;
const dual95Codice2 = dual95Placed.find((p) => p.field === "codiceSecondario")!;
assert.equal(dual95Marca.lines.join(" "), "BTE / OMB", "95x40 doppia marca: marche unite");
assert.ok(!dual95Placed.some((p) => p.field === "marcaSecondaria"));
assert.ok(dual95Codice!.lines.join("").includes("(BTE)"));
assert.ok(dual95Codice2!.lines.join("").includes("(OMB)"));
assert.ok(dual95Codice2!.yMm > dual95Codice!.yMm);

const m12 = resolveLabelTextLayout(template, {
  marca: "BTE",
  marcaSecondaria: "",
  descrizione: "Sensore fotoelettrico M12",
  codice: "ABC",
  codiceSecondario: "",
  fornitoreAlternativo: "",
  codiceAlternativo: "",
  fornitoriAlternativi: [],
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
  fornitoriAlternativi: [{ name: "Ricambi", code: "RX-1" }],
});
const wideCodice = widePlaced.find((p) => p.field === "codice")!;
const wideCodiceEl = findTextEl(wide, "codice");
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
  fornitoriAlternativi: [{ name: "Ricambi Express SRL", code: "RX-90812-ABCDEF" }],
};
const smallPlaced = resolveLabelTextLayout(small, smallPayload);
const smallW = findTextEl(small, "marca").maxWidthMm!;
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
assert.equal(smallDesc.fontPt, findTextEl(small, "descrizione").fontPt);

const a4 = getLabelTemplate("a4-pagina-intera")!;
const a4Placed = resolveLabelTextLayout(a4, {
  marca: "BTE",
  marcaSecondaria: "OMB",
  descrizione: "Sensore",
  codice: "XXXX",
  codiceSecondario: "YYYY",
  fornitoreAlternativo: "Forn",
  codiceAlternativo: "ALT-1",
  fornitoriAlternativi: [{ name: "Forn", code: "ALT-1" }],
});
const a4Marca = a4Placed.find((p) => p.field === "marca")!;
const a4Codice = a4Placed.find((p) => p.field === "codice")!;
const a4Codice2 = a4Placed.find((p) => p.field === "codiceSecondario")!;
assert.equal(a4Marca.lines.join(" "), "BTE / OMB", "A4 doppia marca: marche unite sulla prima riga");
assert.ok(!a4Placed.some((p) => p.field === "marcaSecondaria"), "A4 doppia marca: nessuna riga marca secondaria");
assert.ok(a4Codice.lines.join("").includes("XXXX"));
assert.ok(a4Codice.lines.join("").includes("BTE"), "A4 doppia marca: codice con suffisso marca principale");
assert.ok(a4Codice2!.lines.join("").includes("YYYY"));
assert.ok(a4Codice2!.lines.join("").includes("OMB"), "A4 doppia marca: codice secondario con suffisso marca secondaria");
assert.ok(a4Codice2!.yMm > a4Codice.yMm, "A4: codice secondario sotto codice principale");
for (const p of a4Placed) {
  assert.equal(p.anchor, "middle");
  assert.equal(p.xMm, a4.widthMm / 2);
}

const longDesc =
  "FILTRO OLIO MOTORE AD ALTA PRESTAZIONE PER VEICOLI INDUSTRIALI E AUTOTRASPORTI";
const a4LongPlaced = resolveLabelTextLayout(a4, {
  marca: "BTE",
  marcaSecondaria: "",
  descrizione: longDesc,
  codice: "COD-LUNGO-12345",
  codiceSecondario: "",
  fornitoreAlternativo: "",
  codiceAlternativo: "",
  fornitoriAlternativi: [],
});
const a4DescEl = a4.elements.find((e) => e.type === "text" && e.field === "descrizione");
assert.ok(a4DescEl?.type === "text");
const a4DescW = a4DescEl.maxWidthMm ?? a4.widthMm - a4.marginsMm * 2;
const a4ShortPlaced = resolveLabelTextLayout(a4, {
  marca: "BTE",
  marcaSecondaria: "",
  descrizione: "FILTRO OLIO MOTORE",
  codice: "FO-123",
  codiceSecondario: "",
  fornitoreAlternativo: "",
  codiceAlternativo: "",
  fornitoriAlternativi: [],
});
const a4ShortDesc = a4ShortPlaced.find((p) => p.field === "descrizione")!;
assert.equal(a4ShortDesc!.lines.length, 1, "A4: descrizione corta su una riga");
for (const p of a4LongPlaced) {
  const base = p.font === "mono" ? "mono" : "sans";
  const slot = labelFontSlotFor(base, true, true);
  assert.ok(
    linesFitInkWidthMm(p.lines, a4DescW, p.fontPt, a4.dpi, slot),
    `A4 long text overflow: ${p.field}`,
  );
}

const manualTemplate = getLabelTemplate("60x40-default", "manual")!;
const manualPlaced = resolveLabelTextLayout(manualTemplate, {
  marca: "BTE",
  marcaSecondaria: "",
  descrizione: "Filtro olio",
  codice: "FO-123",
  codiceSecondario: "",
  fornitoreAlternativo: "",
  codiceAlternativo: "",
  fornitoriAlternativi: [],
});
assert.equal(manualPlaced.length, 3);
for (const p of manualPlaced) {
  assert.equal(p.anchor, "middle");
  assert.equal(p.xMm, manualTemplate.widthMm / 2);
}
const manualMarca = manualPlaced.find((p) => p.field === "marca")!;
const manualDesc = manualPlaced.find((p) => p.field === "descrizione")!;
const manualCodice = manualPlaced.find((p) => p.field === "codice")!;
assert.ok(manualDesc.yMm > manualMarca.yMm);
assert.ok(manualCodice.yMm > manualDesc.yMm);
assert.equal(manualCodice.lines[0], "FO-123");

const manualPartial = resolveLabelTextLayout(manualTemplate, {
  marca: "",
  marcaSecondaria: "",
  descrizione: "",
  codice: "SOLO-COD",
  codiceSecondario: "",
  fornitoreAlternativo: "",
  codiceAlternativo: "",
  fornitoriAlternativi: [],
});
assert.equal(manualPartial.length, 1);
assert.equal(manualPartial[0]!.field, "codice");

console.log("inventory-labels/render/text-layout.test.ts OK");
