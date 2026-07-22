import type { LabelTemplateElement, LabelTypography } from "@/lib/inventory-labels/domain/types";
import { labelFontScale } from "@/lib/inventory-labels/domain/templates";

const BLOCK_GAP_MM = 1.2;
const QR_BARCODE_GAP_MM = 1.5;

function scaledFontPt(basePt: number, scale: number, minPt: number, maxPt: number): number {
  return Math.round(Math.min(maxPt, Math.max(minPt, basePt * scale)) * 2) / 2;
}

/**
 * Layout verticale A4: QR centrato in alto, testi sotto, barcode in fondo.
 * Spazio distribuito dinamicamente — nessuna coordinata hardcoded per blocco testo.
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
  const barcodeH = Math.min(8, Math.max(5, 5.5 * scale * 0.35));
  const barcodeY = heightMm - marginMm - barcodeH;
  const contentBottom = barcodeY - QR_BARCODE_GAP_MM;

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
      yMm: barcodeY - altPt * 0.35,
      fontPt: altPt,
      maxWidthMm: textW,
      zoneBottomMm: barcodeY - 0.5,
    },
    {
      type: "text",
      field: "codiceAlternativo",
      xMm: textX,
      yMm: barcodeY - 0.2,
      fontPt: altPt,
      font: "mono",
      maxWidthMm: textW,
      zoneBottomMm: barcodeY - 0.5,
    },
    {
      type: "barcode",
      field: "codice",
      format: "code128",
      xMm: qrX,
      yMm: barcodeY,
      heightMm: barcodeH,
      widthMm: qrSize,
    },
  ];
}
