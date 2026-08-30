import {
  MEZZO_LABEL_TEMPLATE,
  mmToPt,
  mmToPx,
  type MezzoLabelTemplate,
} from "@/lib/mezzo-labels/domain/template";
import type { MezzoLabelPayload } from "@/lib/mezzo-labels/domain/types";
import { labelFontSlotFor, measureTextLineWidthPx } from "@/lib/inventory-labels/render/text-paths";
import { lineMetrics } from "@/lib/inventory-labels/render/text-metrics";

export type MezzoLabelPlacedText = {
  kind: "scuderia" | "targa";
  xMm: number;
  yMm: number;
  text: string;
  fontPt: number;
  bold: boolean;
  maxWidthMm: number;
};

export type MezzoLabelComposition = {
  template: MezzoLabelTemplate;
  payload: MezzoLabelPayload;
  qrUrl: string;
  logo: { xMm: number; yMm: number; maxWidthMm: number; maxHeightMm: number };
  qr: { xMm: number; yMm: number; sizeMm: number };
  texts: MezzoLabelPlacedText[];
};

function fontLineHeightMm(fontPt: number, factor: number): number {
  return (fontPt / 72) * 25.4 * factor;
}

function textInkWidthMm(
  text: string,
  fontPt: number,
  bold: boolean,
  dpi: number,
): number {
  const slot = labelFontSlotFor("sans", bold, true);
  const { fontSizePx } = lineMetrics(fontPt, dpi);
  return (measureTextLineWidthPx(text, fontSizePx, slot) / dpi) * 25.4;
}

function centeredTextXMm(
  text: string,
  fontPt: number,
  bold: boolean,
  zoneLeftMm: number,
  zoneWidthMm: number,
  dpi: number,
): number {
  const inkW = textInkWidthMm(text, fontPt, bold, dpi);
  return zoneLeftMm + (zoneWidthMm - inkW) / 2;
}

function fitFontPt(
  text: string,
  maxWidthMm: number,
  startPt: number,
  minPt: number,
  bold: boolean,
  dpi: number,
): number {
  const slot = labelFontSlotFor("sans", bold, true);
  const maxPx = mmToPx(maxWidthMm, dpi);
  for (let pt = startPt; pt >= minPt; pt -= 0.25) {
    const { fontSizePx } = lineMetrics(pt, dpi);
    if (measureTextLineWidthPx(text, fontSizePx, slot) <= maxPx) return pt;
  }
  return minPt;
}

/** Layout engine — single source for SVG/PNG/PDF geometry. */
export function composeMezzoLabel(
  payload: MezzoLabelPayload,
  qrUrl: string,
  template: MezzoLabelTemplate = MEZZO_LABEL_TEMPLATE,
): MezzoLabelComposition {
  const scuderiaRaw = payload.numeroScuderia?.trim() ?? "";
  const hasScuderia = scuderiaRaw.length > 0;
  const targaRaw = payload.targa?.trim() ?? "";
  const hasTarga = targaRaw.length > 0;
  const targaText = hasTarga ? targaRaw.toUpperCase() : "";

  const whiteMargin = template.cutBorderMm;
  const pad = template.innerPaddingMm;
  const leftPad = template.leftColumnPadMm;
  const innerH = template.heightMm - whiteMargin * 2;
  const gutter = template.columnGutterMm;

  const logoW = template.logo.maxWidthMm;
  const logoH = template.logo.maxHeightMm;
  const contentTop = whiteMargin + pad;
  const qrGap = 0.3;
  const qrAreaTop = contentTop + logoH + qrGap;
  const qrAreaBottom = whiteMargin + innerH - pad;
  const qrMaxByHeight = qrAreaBottom - qrAreaTop;
  const qrSize = Math.min(template.qr.maxSizeMm, qrMaxByHeight);


  const qrX = whiteMargin + pad + leftPad;
  const qrY = qrAreaTop + (qrMaxByHeight - qrSize) / 2;
  const logoX = qrX + (qrSize - logoW) / 2;
  const logoY = contentTop;

  const textZoneLeftMm = qrX + qrSize + gutter;
  const textZoneRightMm = template.widthMm - whiteMargin;
  const textZoneWidthMm = textZoneRightMm - textZoneLeftMm;

  const textStyle = template.targa;
  const textBold = true;

  const texts: MezzoLabelPlacedText[] = [];
  const scuderiaFontPt = hasScuderia
    ? fitFontPt(
        scuderiaRaw,
        textZoneWidthMm,
        textStyle.fontPt,
        textStyle.minFontPt,
        textBold,
        template.dpi,
      )
    : 0;
  const targaFontPt = hasTarga
    ? fitFontPt(
        targaText,
        textZoneWidthMm,
        textStyle.fontPt,
        textStyle.minFontPt,
        textBold,
        template.dpi,
      )
    : 0;

  const scuderiaLineMm = hasScuderia
    ? fontLineHeightMm(scuderiaFontPt, textStyle.lineHeight)
    : 0;
  const targaLineMm = hasTarga ? fontLineHeightMm(targaFontPt, textStyle.lineHeight) : 0;
  const textGapMm = hasScuderia && hasTarga ? 0.5 : 0;
  const blockMm =
    hasScuderia && hasTarga
      ? scuderiaLineMm + textGapMm + targaLineMm
      : hasScuderia
        ? scuderiaLineMm
        : targaLineMm;
  const textStartY = whiteMargin + pad + (innerH - pad * 2 - blockMm) / 2;

  if (hasScuderia) {
    texts.push({
      kind: "scuderia",
      xMm: centeredTextXMm(
        scuderiaRaw,
        scuderiaFontPt,
        textBold,
        textZoneLeftMm,
        textZoneWidthMm,
        template.dpi,
      ),
      yMm: textStartY,
      text: scuderiaRaw,
      fontPt: scuderiaFontPt,
      bold: textBold,
      maxWidthMm: textZoneWidthMm,
    });
  }

  if (hasTarga) {
    texts.push({
      kind: "targa",
      xMm: centeredTextXMm(
        targaText,
        targaFontPt,
        textBold,
        textZoneLeftMm,
        textZoneWidthMm,
        template.dpi,
      ),
      yMm: hasScuderia ? textStartY + scuderiaLineMm + textGapMm : textStartY,
      text: targaText,
      fontPt: targaFontPt,
      bold: textBold,
      maxWidthMm: textZoneWidthMm,
    });
  }

  return {
    template,
    payload,
    qrUrl,
    logo: { xMm: logoX, yMm: logoY, maxWidthMm: logoW, maxHeightMm: logoH },
    qr: { xMm: qrX, yMm: qrY, sizeMm: qrSize },
    texts,
  };
}

export function compositionDimensionsPt(composition: MezzoLabelComposition): {
  widthPt: number;
  heightPt: number;
  qrPt: { x: number; y: number; size: number };
} {
  const t = composition.template;
  return {
    widthPt: mmToPt(t.widthMm),
    heightPt: mmToPt(t.heightMm),
    qrPt: {
      x: mmToPt(composition.qr.xMm),
      y: mmToPt(composition.qr.yMm),
      size: mmToPt(composition.qr.sizeMm),
    },
  };
}
