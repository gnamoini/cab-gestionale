import assert from "node:assert/strict";
import sharp from "sharp";
import { MEZZO_LABEL_TEMPLATE, mmToPx } from "@/lib/mezzo-labels/domain/template";
import { composeMezzoLabel } from "@/lib/mezzo-labels/render/compose-label";
import { renderMezzoLabelSvg } from "@/lib/mezzo-labels/render/svg";

const payload = { targa: "AB123CD", numeroScuderia: "42" };
const qrUrl = "https://example.com/m/q/CAB-TEST";

void (async () => {
  const svg = await renderMezzoLabelSvg(payload, qrUrl);
  assert.ok(svg.includes('stroke="#000000"'), "thin black cut line expected");
  assert.ok(!svg.includes('stroke="#888888"'), "no gray border on mezzo label");

  const comp = composeMezzoLabel(payload, qrUrl);
  assert.equal(comp.logo.xMm, comp.qr.xMm + (comp.qr.sizeMm - comp.logo.maxWidthMm) / 2, "logo centered on QR");
  assert.ok(svg.includes("<path d="), "text as paths expected");
  assert.ok(svg.includes("<image"), "logo image expected");
  assert.ok(!svg.includes("mm"), "pixel coords only — no mm units in SVG");

  const w = mmToPx(MEZZO_LABEL_TEMPLATE.widthMm);
  const h = mmToPx(MEZZO_LABEL_TEMPLATE.heightMm);
  const { data, info } = await sharp(Buffer.from(svg))
    .png()
    .resize(w, h, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let darkPixels = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (r < 200 || g < 200 || b < 200) darkPixels++;
  }
  assert.ok(darkPixels > 500, `expected ink on label, got ${darkPixels} dark pixels`);

  console.log("mezzo-labels/render/svg.test.ts OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
