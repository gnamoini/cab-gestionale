import assert from "node:assert/strict";
import { cutBorderRectSvg } from "@/lib/inventory-labels/render/cut-border";
import { labelFontFaceCss } from "@/lib/inventory-labels/render/label-fonts";
import { renderLabelSvg } from "@/lib/inventory-labels/render/svg";
import { getLabelTemplate, mmToPx } from "@/lib/inventory-labels/domain/templates";
import { DEFAULT_COMPANY_WEBSITE_URL } from "@/lib/branding/branding-settings-model";
import { formatLabelJobPreset, parseLabelJobPreset } from "@/lib/inventory-labels/validation";

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

  const clienteTemplate = getLabelTemplate("60x40-default", "cliente")!;
  const clienteSvg = await renderLabelSvg(clienteTemplate, payload, DEFAULT_COMPANY_WEBSITE_URL, {
    ...renderOpts,
    includeBarcode: false,
    labelKind: "cliente",
  });
  assert.ok(clienteSvg.includes("<image"), "cliente label embeds logo");
  assert.ok(!clienteSvg.includes("ALT-99"), "cliente label omits supplier alt text");

  const a4Template = getLabelTemplate("a4-pagina-intera")!;
  const a4Svg = await renderLabelSvg(a4Template, payload, qrUrl, { ...renderOpts, includeBarcode: false });
  const a4Paths = a4Svg.match(/<path d="/g)?.length ?? 0;
  assert.ok(a4Paths >= 8, "A4 bold: multi-layer ink paths");

  assert.equal(formatLabelJobPreset("95x40-default", false, true), "95x40-default::no-barcode::cliente");
  assert.deepEqual(parseLabelJobPreset("95x40-default::no-barcode::cliente"), {
    preset: "95x40-default",
    includeBarcode: false,
    clienteLabel: true,
  });

  console.log("inventory-labels/render/svg.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
