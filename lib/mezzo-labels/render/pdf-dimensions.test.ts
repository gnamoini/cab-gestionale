import assert from "node:assert/strict";
import { renderMezzoLabelsPdf } from "@/lib/mezzo-labels/render/pdf";
import { MEZZO_LABEL_TEMPLATE, mmToPt } from "@/lib/mezzo-labels/domain/template";

const slots = [
  {
    payload: { targa: "AB123CD", numeroScuderia: "1" },
    qrUrl: "https://example.com/m/q/CAB-TEST1234",
  },
  {
    payload: { targa: "XY999ZZ", numeroScuderia: null },
    qrUrl: "https://example.com/m/q/CAB-TEST5678",
  },
];

void (async () => {
  const bytes = await renderMezzoLabelsPdf(slots);
  assert.ok(bytes.byteLength > 1000, "PDF should have non-trivial size");

  const labelWPt = mmToPt(MEZZO_LABEL_TEMPLATE.widthMm);
  const labelHPt = mmToPt(MEZZO_LABEL_TEMPLATE.heightMm);
  assert.ok(Math.abs(labelWPt - 141.73) < 0.1, `label width pt ~141.73, got ${labelWPt}`);
  assert.ok(Math.abs(labelHPt - 62.36) < 0.1, `label height pt ~62.36, got ${labelHPt}`);

  console.log("mezzo-labels/render/pdf-dimensions.test.ts OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
