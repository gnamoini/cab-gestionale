import assert from "node:assert/strict";
import { cutBorderRectSvg } from "@/lib/inventory-labels/render/cut-border";
import { labelFontFaceCss } from "@/lib/inventory-labels/render/label-fonts";
import { renderLabelSvg } from "@/lib/inventory-labels/render/svg";
import { getLabelTemplate, mmToPx } from "@/lib/inventory-labels/domain/templates";

const template = getLabelTemplate("60x40-default")!;
const w = mmToPx(template.widthMm, template.dpi);
const h = mmToPx(template.heightMm, template.dpi);
const border = cutBorderRectSvg(w, h, template.cutBorderMm, template.dpi);

assert.ok(border);
assert.ok(border!.includes('stroke="#888888"'), "cut border stroke expected");
assert.equal(cutBorderRectSvg(w, h, 0, template.dpi), null);

const css = labelFontFaceCss();
assert.ok(css.includes("LabelSans"));
assert.ok(css.includes("LabelMono"));

const payload = {
  marca: "BTE",
  marcaSecondaria: "",
  descrizione: "FILTRO OLIO",
  codice: "8FSNS030000001",
  codiceSecondario: "",
  fornitoreAlternativo: "ALT FORN",
  codiceAlternativo: "ALT-99",
  fornitoriAlternativi: [{ name: "ALT FORN", code: "ALT-99" }],
};
const qrUrl = "https://example.test/r/CAB-TESTTOKEN1";
const renderOpts = { embedFonts: false, textAsPaths: true } as const;

async function main() {
  const withBarcode = await renderLabelSvg(template, payload, qrUrl, { ...renderOpts, includeBarcode: true });
  const withoutBarcode = await renderLabelSvg(template, payload, qrUrl, { ...renderOpts, includeBarcode: false });

  assert.ok(withBarcode.length > withoutBarcode.length, "barcode adds ink to SVG");
  assert.equal(
    withBarcode.match(/viewBox="0 0 (\d+) (\d+)"/)?.[0],
    withoutBarcode.match(/viewBox="0 0 (\d+) (\d+)"/)?.[0],
    "layout dimensions unchanged without barcode",
  );

  console.log("inventory-labels/render/svg.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
