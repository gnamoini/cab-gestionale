import assert from "node:assert/strict";
import sharp from "sharp";
import { textLineToSvgPath } from "@/lib/inventory-labels/render/text-paths";

async function main() {
  const path = textLineToSvgPath("BTE Filtro olio", 12, 18, 18, "sans", "hanging");
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="60" viewBox="0 0 240 60">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    path,
    `</svg>`,
  ].join("");

  const { data, info } = await sharp(Buffer.from(svg)).png().raw().toBuffer({ resolveWithObject: true });
  let darkPixels = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i]! + data[i + 1]! + data[i + 2]! < 30) darkPixels++;
    }
  }
  assert.ok(darkPixels > 40, `testo non rasterizzato (darkPixels=${darkPixels})`);
  console.log("inventory-labels/render/png-text.render.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
