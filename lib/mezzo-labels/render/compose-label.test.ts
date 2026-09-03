import assert from "node:assert/strict";
import { composeMezzoLabel } from "@/lib/mezzo-labels/render/compose-label";
import { mmToPt, MEZZO_LABEL_TEMPLATE } from "@/lib/mezzo-labels/domain/template";
import { labelFontSlotFor, measureTextLineWidthPx } from "@/lib/inventory-labels/render/text-paths";
import { lineMetrics } from "@/lib/inventory-labels/render/text-metrics";

function fontLineHeightMm(fontPt: number, factor: number): number {
  return (fontPt / 72) * 25.4 * factor;
}

function textInkWidthMm(text: string, fontPt: number, bold: boolean, dpi: number): number {
  const slot = labelFontSlotFor("sans", bold, true);
  const { fontSizePx } = lineMetrics(fontPt, dpi);
  return (measureTextLineWidthPx(text, fontSizePx, slot) / dpi) * 25.4;
}

function textZoneBounds(comp: ReturnType<typeof composeMezzoLabel>) {
  const zoneLeft = comp.qr.xMm + comp.qr.sizeMm + MEZZO_LABEL_TEMPLATE.columnGutterMm;
  const zoneRight =
    MEZZO_LABEL_TEMPLATE.widthMm -
    MEZZO_LABEL_TEMPLATE.cutBorderMm -
    MEZZO_LABEL_TEMPLATE.innerPaddingMm;
  return { zoneLeft, zoneWidth: zoneRight - zoneLeft, zoneCenter: zoneLeft + (zoneRight - zoneLeft) / 2 };
}

function textZoneCenterX(comp: ReturnType<typeof composeMezzoLabel>, t: { text: string; fontPt: number; bold: boolean; xMm: number }) {
  const { zoneCenter } = textZoneBounds(comp);
  const inkW = textInkWidthMm(t.text, t.fontPt, t.bold, MEZZO_LABEL_TEMPLATE.dpi);
  return t.xMm + inkW / 2 - zoneCenter;
}

function logoCenterX(comp: ReturnType<typeof composeMezzoLabel>) {
  const { zoneLeft, zoneWidth } = textZoneBounds(comp);
  return comp.logo.xMm + comp.logo.maxWidthMm / 2 - (zoneLeft + zoneWidth / 2);
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
assert.equal(withScuderia.texts[0]?.fontPt, withScuderia.texts[1]?.fontPt, "scuderia and targa same font size");
assert.ok(Math.abs(textZoneCenterX(withScuderia, withScuderia.texts[0]!)) < 0.05, "scuderia centered in right zone");
assert.ok(Math.abs(textZoneCenterX(withScuderia, withScuderia.texts[1]!)) < 0.05, "targa centered in right zone");
assert.ok(Math.abs(logoCenterX(withScuderia)) < 0.05, "logo centered in right zone");
const labelCenterY = MEZZO_LABEL_TEMPLATE.heightMm / 2;
const qrCenterY = withScuderia.qr.yMm + withScuderia.qr.sizeMm / 2;
assert.ok(Math.abs(qrCenterY - labelCenterY) < 0.05, "QR vertically centered on label");
assert.equal(withScuderia.logo.yMm, MEZZO_LABEL_TEMPLATE.cutBorderMm + MEZZO_LABEL_TEMPLATE.innerPaddingMm, "logo pinned to top");
const textBlockBottom =
  withScuderia.texts[withScuderia.texts.length - 1]!.yMm +
  fontLineHeightMm(
    withScuderia.texts[withScuderia.texts.length - 1]!.fontPt,
    MEZZO_LABEL_TEMPLATE.targa.lineHeight,
  );
const textBlockCenter = (withScuderia.texts[0]!.yMm + textBlockBottom) / 2;
assert.ok(Math.abs(textBlockCenter - labelCenterY) < 0.05, "scuderia+targa at absolute vertical center");
assert.ok(withScuderia.texts[0]!.xMm > withScuderia.qr.xMm + withScuderia.qr.sizeMm, "text right of QR");

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
