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
assert.ok(css.includes("LabelSansBold"));

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
  const svg = await renderLabelSvg(template, payload, qrUrl, renderOpts);
  assert.ok(svg.includes("<svg"), "renders label svg");
  assert.ok(svg.includes("8FSNS030000001") || svg.includes("<path"), "codice ink present");

  const clienteTemplate = getLabelTemplate("60x40-default", "cliente")!;
  const clienteSvg = await renderLabelSvg(clienteTemplate, payload, DEFAULT_COMPANY_WEBSITE_URL, {
    embedFonts: false,
    labelKind: "cliente",
    textAsPaths: false,
  });
  assert.ok(clienteSvg.includes("<image"), "cliente label embeds logo");
  assert.ok(clienteSvg.includes("www.autocompattatori.it"), "cliente label shows website under QR");
  const clienteQr = clienteTemplate.elements.find((e) => e.type === "qr");
  const clienteWebsite = clienteTemplate.elements.find(
    (e) => e.type === "text" && e.literalSource === "clienteWebsite",
  );
  assert.ok(clienteQr && clienteQr.type === "qr");
  assert.ok(clienteWebsite && clienteWebsite.type === "text");
  const websiteX = mmToPx(clienteWebsite.xMm, clienteTemplate.dpi);
  const websiteText = clienteSvg.match(
    new RegExp(`<text x="${websiteX}"[^>]*text-anchor="middle"[^>]*>www\\.autocompattatori\\.it</text>`),
  );
  assert.ok(websiteText, "cliente website centered on QR");
  assert.ok(!clienteSvg.includes("ALT-99"), "cliente label omits supplier alt text");

  const a4Template = getLabelTemplate("a4-pagina-intera")!;
  const a4SvgPaths = await renderLabelSvg(a4Template, payload, qrUrl, {
    embedFonts: false,
    textAsPaths: true,
  });
  assert.ok(!a4SvgPaths.includes("paint-order=\"stroke fill\""), "A4 native bold: no faux-bold stroke on text");

  const a4Svg = await renderLabelSvg(a4Template, payload, qrUrl, {
    embedFonts: false,
    textAsPaths: false,
  });
  assert.ok(a4Svg.includes("text-anchor=\"middle\""), "A4: testo centrato");
  assert.ok(a4Svg.includes("font-family=\"LabelSansBold\""), "A4: font bold nativo");

  const dualMarcaPayload = {
    marca: "BTE",
    marcaSecondaria: "OMB",
    descrizione: "FILTRO OLIO",
    codice: "XXXX",
    codiceSecondario: "YYYY",
    fornitoreAlternativo: "ALT FORN",
    codiceAlternativo: "ALT-99",
    fornitoriAlternativi: [{ name: "ALT FORN", code: "ALT-99" }],
  };
  const dual95Template = getLabelTemplate("95x40-default")!;
  const dual95Svg = await renderLabelSvg(dual95Template, dualMarcaPayload, qrUrl, {
    ...renderOpts,
    textAsPaths: false,
    embedFonts: true,
  });
  assert.ok(dual95Svg.includes("BTE"), "95x40 dual marca: marca principale nel SVG");
  assert.ok(dual95Svg.includes("OMB"), "95x40 dual marca: marca secondaria nel SVG");
  assert.ok(dual95Svg.includes("XXXX"), "95x40 dual marca: codice principale nel SVG");
  assert.ok(dual95Svg.includes("YYYY"), "95x40 dual marca: codice secondario nel SVG");

  assert.equal(formatLabelJobPreset("95x40-default", true), "95x40-default::cliente");
  assert.deepEqual(parseLabelJobPreset("95x40-default::no-barcode::cliente"), {
    preset: "95x40-default",
    clienteLabel: true,
  });

  console.log("inventory-labels/render/svg.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
