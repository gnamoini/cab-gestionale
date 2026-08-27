import assert from "node:assert/strict";
import { composeMezzoLabel } from "@/lib/mezzo-labels/render/compose-label";
import { mmToPt, MEZZO_LABEL_TEMPLATE } from "@/lib/mezzo-labels/domain/template";
import { labelFontSlotFor, measureTextLineWidthPx } from "@/lib/inventory-labels/render/text-paths";
import { lineMetrics } from "@/lib/inventory-labels/render/text-metrics";

function textInkWidthMm(text: string, fontPt: number, bold: boolean, dpi: number): number {
  const slot = labelFontSlotFor("sans", bold, true);
  const { fontSizePx } = lineMetrics(fontPt, dpi);
  return (measureTextLineWidthPx(text, fontSizePx, slot) / dpi) * 25.4;
}

function textZoneCenterX(comp: ReturnType<typeof composeMezzoLabel>, t: { text: string; fontPt: number; bold: boolean; xMm: number }) {
  const zoneLeft = comp.qr.xMm + comp.qr.sizeMm + MEZZO_LABEL_TEMPLATE.columnGutterMm;
  const zoneRight = MEZZO_LABEL_TEMPLATE.widthMm - MEZZO_LABEL_TEMPLATE.cutBorderMm;
  const zoneCenter = zoneLeft + (zoneRight - zoneLeft) / 2;
  const inkW = textInkWidthMm(t.text, t.fontPt, t.bold, MEZZO_LABEL_TEMPLATE.dpi);
  return t.xMm + inkW / 2 - zoneCenter;
}

const withScuderia = composeMezzoLabel(
  { targa: "AB123CD", numeroScuderia: "42" },
  "https://example.com/m/q/CAB-TEST",
);
assert.equal(withScuderia.texts.length, 2);
assert.equal(withScuderia.texts[0]?.kind, "scuderia");
assert.equal(withScuderia.texts[0]?.text, "42");
assert.equal(withScuderia.texts[0]?.bold, true);
assert.equal(withScuderia.texts[1]?.kind, "targa");
assert.equal(withScuderia.texts[1]?.text, "AB123CD");
assert.equal(withScuderia.texts[1]?.bold, true);
assert.ok(Math.abs(textZoneCenterX(withScuderia, withScuderia.texts[0]!)) < 0.05, "scuderia centered in right zone");
assert.ok(Math.abs(textZoneCenterX(withScuderia, withScuderia.texts[1]!)) < 0.05, "targa centered in right zone");
assert.equal(withScuderia.logo.xMm, withScuderia.qr.xMm + (withScuderia.qr.sizeMm - withScuderia.logo.maxWidthMm) / 2);
assert.ok(withScuderia.qr.xMm >= MEZZO_LABEL_TEMPLATE.cutBorderMm);

const withoutScuderia = composeMezzoLabel(
  { targa: "XY999ZZ", numeroScuderia: null },
  "https://example.com/m/q/CAB-TEST",
);
assert.equal(withoutScuderia.texts.length, 1);
assert.equal(withoutScuderia.texts[0]?.kind, "targa");
assert.equal(withoutScuderia.texts[0]?.text, "XY999ZZ");
assert.ok(Math.abs(textZoneCenterX(withoutScuderia, withoutScuderia.texts[0]!)) < 0.05, "targa centered when alone");

const onlyScuderia = composeMezzoLabel(
  { targa: "", numeroScuderia: "42" },
  "https://example.com/m/q/CAB-TEST",
);
assert.equal(onlyScuderia.texts.length, 1);
assert.equal(onlyScuderia.texts[0]?.kind, "scuderia");
assert.equal(onlyScuderia.texts[0]?.text, "42");
assert.ok(Math.abs(textZoneCenterX(onlyScuderia, onlyScuderia.texts[0]!)) < 0.05, "scuderia centered when alone");

const neither = composeMezzoLabel(
  { targa: "", numeroScuderia: null },
  "https://example.com/m/q/CAB-TEST",
);
assert.equal(neither.texts.length, 0);

const qrPt = mmToPt(withScuderia.qr.sizeMm);
assert.ok(qrPt > 0, "QR size in pt");

console.log("mezzo-labels/render/compose-label.test.ts OK");
