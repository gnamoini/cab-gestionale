import assert from "node:assert/strict";
import sharp from "sharp";
import { getLabelTemplate } from "@/lib/inventory-labels/domain/templates";
import { renderMultiLabelPdfWithPipeline } from "@/lib/inventory-labels/render/pdf-pipeline";

const MOCK_ITEM = {
  payload: {
    marca: "BOSCH",
    marcaSecondaria: "MANN",
    descrizione: "Filtro olio",
    codice: "ABC1234",
    codiceSecondario: "OE999",
    fornitoreAlternativo: "RICAMBI",
    codiceAlternativo: "ALT42",
  },
  qrUrl: "https://example.test/r/CAB-TESTTOKEN01",
};

async function assertPdfHasInk(pdf: Uint8Array): Promise<void> {
  assert.ok(pdf.byteLength > 800, `PDF troppo piccolo (${pdf.byteLength} bytes)`);
  const header = Buffer.from(pdf.slice(0, 8)).toString("ascii");
  assert.ok(header.startsWith("%PDF"), "header PDF mancante");
}

async function assertLabelRasterText(templateId: string): Promise<void> {
  const template = getLabelTemplate(templateId);
  assert.ok(template);
  const result = await renderMultiLabelPdfWithPipeline(template!, [MOCK_ITEM]);
  assert.equal(result.kind, "pdf", "expected pdf pipeline");
  await assertPdfHasInk(result.bytes);

  const { renderLabelPng } = await import("@/lib/inventory-labels/render/png");
  const png = await renderLabelPng(template!, MOCK_ITEM.payload, MOCK_ITEM.qrUrl);
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let darkPixels = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i]! + data[i + 1]! + data[i + 2]! < 30) darkPixels++;
    }
  }
  assert.ok(darkPixels > 40, `testo non rasterizzato (darkPixels=${darkPixels})`);
}

async function main() {
  const template = getLabelTemplate("60x40-default")!;
  for (const count of [1, 10, 50]) {
    const items = Array.from({ length: count }, () => MOCK_ITEM);
    const t0 = performance.now();
    const result = await renderMultiLabelPdfWithPipeline(template, items);
    assert.equal(result.kind, "pdf");
    await assertPdfHasInk(result.bytes);
    console.log(`bulk ${count}: ${result.bytes.byteLength} bytes, pipeline=${result.pipeline}, ${Math.round(performance.now() - t0)}ms`);
  }
  await assertLabelRasterText("60x40-default");
  console.log("bulk-pdf.integration.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
