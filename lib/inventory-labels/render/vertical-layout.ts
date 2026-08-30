import type { LabelTemplateElement, LabelTypography } from "@/lib/inventory-labels/domain/types";
import { labelFontScale } from "@/lib/inventory-labels/domain/templates";

const BLOCK_GAP_MM = 1.2;

function scaledFontPt(basePt: number, scale: number, minPt: number, maxPt: number): number {
  return Math.round(Math.min(maxPt, Math.max(minPt, basePt * scale)) * 2) / 2;
}

/**
 * Layout verticale A4: QR centrato in alto, testi sotto.
 */
export function computeVerticalStackLayout(
  widthMm: number,
  heightMm: number,
  marginMm: number,
  typography: LabelTypography,
  qrMaxSizeMm: number,
): LabelTemplateElement[] {
  const innerW = widthMm - marginMm * 2;
  const scale = labelFontScale(widthMm, heightMm) * typography.scale;
  const primaryPt = scaledFontPt(7, scale, 12, 28) * typography.scale;
  const altPt = scaledFontPt(6, scale, 10, 18) * typography.scale;
  const labelBottomMm = heightMm - marginMm;
  const supplierBandH = Math.max(altPt * 0.35 * 2, 5);
  const supplierTop = labelBottomMm - supplierBandH;
  const contentBottom = supplierTop - 0.6;

  const qrSize = Math.min(qrMaxSizeMm, innerW * 0.42, contentBottom - marginMm - 40);
  const qrX = marginMm + (innerW - qrSize) / 2;
  const textX = marginMm;
  const textW = innerW;
  const textTop = marginMm + qrSize + BLOCK_GAP_MM * 2;

  return [
    { type: "qr", xMm: qrX, yMm: marginMm, sizeMm: qrSize },
    {
      type: "text",
      field: "marca",
      xMm: textX,
      yMm: textTop,
      fontPt: primaryPt,
      maxWidthMm: textW,
      zoneBottomMm: contentBottom,
    },
    {
      type: "text",
      field: "codice",
      xMm: textX,
      yMm: textTop,
      fontPt: primaryPt,
      font: "mono",
      maxWidthMm: textW,
      zoneBottomMm: contentBottom,
    },
    {
      type: "text",
      field: "descrizione",
      xMm: textX,
      yMm: textTop,
      fontPt: primaryPt,
      maxWidthMm: textW,
      zoneBottomMm: contentBottom,
    },
    {
      type: "text",
      field: "marcaSecondaria",
      xMm: textX,
      yMm: textTop,
      fontPt: primaryPt,
      maxWidthMm: textW,
      zoneBottomMm: contentBottom,
    },
    {
      type: "text",
      field: "codiceSecondario",
      xMm: textX,
      yMm: textTop,
      fontPt: primaryPt,
      font: "mono",
      maxWidthMm: textW,
      zoneBottomMm: contentBottom,
    },
    {
      type: "text",
      field: "fornitoreAlternativo",
      xMm: textX,
      yMm: supplierTop,
      fontPt: altPt,
      maxWidthMm: textW,
      zoneBottomMm: labelBottomMm,
    },
    {
      type: "text",
      field: "codiceAlternativo",
      xMm: textX,
      yMm: supplierTop,
      fontPt: altPt,
      font: "mono",
      maxWidthMm: textW,
      zoneBottomMm: labelBottomMm,
    },
  ];
}
