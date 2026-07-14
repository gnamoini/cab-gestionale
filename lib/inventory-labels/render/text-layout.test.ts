import assert from "node:assert/strict";
import { getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { fieldValue, linesFitWrapWidth } from "@/lib/inventory-labels/render/layout";
import { resolveLabelTextLayout } from "@/lib/inventory-labels/render/text-layout";
import { blockHeightMm, lineMetrics, nextRowBaselineMm } from "@/lib/inventory-labels/render/text-metrics";

const template = getLabelTemplate("60x40-default")!;
const codiceEl = template.elements.find((e) => e.type === "text" && e.field === "codice")!;
assert.ok(codiceEl && codiceEl.type === "text" && codiceEl.zoneBottomMm != null);

const payload = {
  marca: "BTE",
  descrizione:
    "Filtro olio motore ad alte prestazioni per veicoli commerciali pesanti e industriali",
  codice: "8FSNS030000001",
  fornitoreAlternativo: "Ricambi Express",
  codiceAlternativo: "RX-90812",
};

const placed = resolveLabelTextLayout(template, payload);
const desc = placed.find((p) => p.field === "descrizione")!;
const codice = placed.find((p) => p.field === "codice")!;
const altForn = placed.find((p) => p.field === "fornitoreAlternativo")!;
const altCod = placed.find((p) => p.field === "codiceAlternativo")!;

assert.ok(desc.lines.length >= 2);
assert.ok(linesFitWrapWidth(desc.lines, codiceEl.maxWidthMm ?? 20, desc.fontPt));
assert.equal(codice.lines.length, 1, "codice su una sola riga");
assert.equal(codice.lines.join(""), payload.codice);
assert.ok(codice.fontPt >= 7, `codice font troppo piccolo: ${codice.fontPt}`);
const rowStep = lineMetrics(desc.fontPt, template.dpi).lineStepMm;
assert.ok(codice.yMm > desc.yMm, "codice sotto descrizione");
const descToCodiceGap =
  codice.yMm -
  nextRowBaselineMm(desc.yMm, desc.lines.length, desc.fontPt, rowStep, template.dpi);
assert.ok(Math.abs(descToCodiceGap - 0.6) < 0.02, "extra spazio descrizione→codice");
assert.ok(altForn.lines[0] === payload.fornitoreAlternativo);
assert.ok(altCod.lines[0] === payload.codiceAlternativo);
assert.ok(altForn.yMm > codice.yMm);
assert.ok(altCod.yMm > altForn.yMm);
const codiceGap = altForn.yMm - nextRowBaselineMm(codice.yMm, 1, codice.fontPt, rowStep, template.dpi);
assert.ok(Math.abs(codiceGap - 0.3) < 0.02, "extra spazio codice→fornitore");
assert.ok(altForn.fontPt <= desc.fontPt, "fornitore alt non più grande della descrizione");

const m12 = resolveLabelTextLayout(template, {
  marca: "BTE",
  descrizione: "Sensore fotoelettrico M12",
  codice: "ABC",
  fornitoreAlternativo: "",
  codiceAlternativo: "",
});
const m12desc = m12.find((p) => p.field === "descrizione")!;
const textW =
  template.elements.find((e) => e.type === "text" && e.field === "marca" && "maxWidthMm" in e)!
    .maxWidthMm ?? 24.5;
assert.ok(linesFitWrapWidth(m12desc.lines, textW, m12desc.fontPt));
assert.ok(
  !m12desc.lines.some((l) => l.includes("fotoelettrico M12")),
  `M12 non sulla stessa riga di fotoelettrico: ${JSON.stringify(m12desc.lines)}`,
);

const bottom = codiceEl.zoneBottomMm!;
const last = m12[m12.length - 1]!;
const stackBottom =
  last.yMm + blockHeightMm(last.lines.length, last.fontPt, template.dpi);
assert.ok(stackBottom <= bottom + 0.15, `stack overflow: ${stackBottom} > ${bottom}`);

console.log("inventory-labels/render/text-layout.test.ts OK");
