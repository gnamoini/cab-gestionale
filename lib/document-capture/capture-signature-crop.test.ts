import assert from "node:assert/strict";
import sharp from "sharp";
import { shouldExtractCaptureSignatures } from "@/lib/document-capture/capture-signature-crop";
import { cropNormalizedBboxToPngDataUrl } from "@/lib/document-capture/capture-bbox-crop.server";

assert.equal(shouldExtractCaptureSignatures("ingresso", []), true);
assert.equal(shouldExtractCaptureSignatures("lavorazioni", ["cliente"]), false);
assert.equal(shouldExtractCaptureSignatures(null, ["riga_1_nome"]), false);
assert.equal(
  shouldExtractCaptureSignatures(null, ["riga_1_nome", "cliente", "data_ingresso"]),
  true,
);
assert.equal(shouldExtractCaptureSignatures(null, ["cliente", "data_ingresso"]), true);
assert.equal(shouldExtractCaptureSignatures(null, []), true);

async function run(): Promise<void> {
  const png = await sharp({
    create: { width: 200, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .png()
    .toBuffer();

  const dataUrl = await cropNormalizedBboxToPngDataUrl(
    new Uint8Array(png),
    { ymin: 200, xmin: 100, ymax: 800, xmax: 900 },
    "image/png",
  );
  assert.ok(dataUrl?.startsWith("data:image/png;base64,"));
  console.log("capture-signature-crop.test.ts OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
