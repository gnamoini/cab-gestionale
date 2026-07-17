import assert from "node:assert/strict";
import sharp from "sharp";
import {
  ensureLabelFontConfig,
  labelFontFaceCss,
  usesFontConfigForLabelRaster,
} from "@/lib/inventory-labels/render/label-fonts";

async function main() {
  ensureLabelFontConfig();
  const embedFonts = !usesFontConfigForLabelRaster();
  if (embedFonts) {
    const css = labelFontFaceCss();
    assert.ok(css.includes("@font-face"), "font-face CSS expected");
    assert.ok(css.includes("LabelSans"), "LabelSans expected");
    assert.ok(css.includes("data:font/woff2;base64,"), "embedded woff2 expected");
  }

  const defs = embedFonts
    ? `<defs><style>${labelFontFaceCss()}</style></defs>`
    : "";

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="60" viewBox="0 0 240 60">`,
    defs,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    `<text x="12" y="18" dominant-baseline="hanging" font-family="LabelSans" font-size="18" fill="#000000">BTE Filtro olio</text>`,
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

  assert.ok(darkPixels > 40, `testo non rasterizzato (darkPixels=${darkPixels}, fontconfig=${usesFontConfigForLabelRaster()})`);
  console.log("inventory-labels/render/png-text.render.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
