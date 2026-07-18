import assert from "node:assert/strict";
import sharp from "sharp";
import { pngBufferHasSignatureInk } from "@/lib/document-capture/capture-signature-ink";

async function run(): Promise<void> {
  const blank = await sharp({
    create: { width: 120, height: 60, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .png()
    .toBuffer();
  assert.equal(await pngBufferHasSignatureInk(blank), false);

  const signed = await sharp({
    create: { width: 120, height: 60, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 80, height: 30, channels: 3, background: { r: 0, g: 0, b: 0 } },
        })
          .png()
          .toBuffer(),
        top: 15,
        left: 20,
      },
    ])
    .png()
    .toBuffer();
  assert.equal(await pngBufferHasSignatureInk(signed), true);

  console.log("capture-signature-ink.test.ts OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
