import assert from "node:assert/strict";
import { DEFAULT_COMPANY_WEBSITE_URL, companyWebsiteDisplayHost } from "@/lib/branding/branding-settings-model";
import { getLabelTemplate, mmToPx } from "@/lib/inventory-labels/domain/templates";
import { renderLabelSvg } from "@/lib/inventory-labels/render/svg";

const payload = {
  marca: "BTE",
  marcaSecondaria: "",
  descrizione: "FILTRO",
  codice: "ABC123",
  codiceSecondario: "",
  fornitoreAlternativo: "",
  codiceAlternativo: "",
  fornitoriAlternativi: [] as { name: string; code: string | null }[],
};

async function main() {
  const template = getLabelTemplate("95x40-default", "cliente")!;
  assert.equal(template.version, "1.8.5-cliente");
  const qr = template.elements.find((e) => e.type === "qr");
  const website = template.elements.find(
    (e) => e.type === "text" && e.literalSource === "clienteWebsite",
  );
  assert.ok(qr && qr.type === "qr");
  assert.ok(website && website.type === "text");

  const host = companyWebsiteDisplayHost(DEFAULT_COMPANY_WEBSITE_URL);
  const qrCenterX = mmToPx(qr.xMm + qr.sizeMm / 2, template.dpi);

  for (const textAsPaths of [false, true]) {
    const svg = await renderLabelSvg(template, payload, DEFAULT_COMPANY_WEBSITE_URL, {
      embedFonts: !textAsPaths,
      textAsPaths,
      includeBarcode: false,
      labelKind: "cliente",
    });

    if (textAsPaths) {
      assert.ok(svg.includes('<path d="'), "website rendered as paths");
    } else {
      assert.ok(svg.includes(host), "website visible as text");
      const match = svg.match(new RegExp(`<text x="(\\d+)"[^>]*>${host.replace(/\./g, "\\.")}</text>`));
      assert.ok(match, "website text element");
      assert.equal(Number(match[1]), qrCenterX, "website text centered on QR");
      assert.ok(svg.includes('text-anchor="middle"'), "website uses center text anchor");
    }
  }

  console.log("cliente-website-align.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
