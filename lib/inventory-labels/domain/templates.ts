import type { LabelTemplateDefinition, LabelTemplateElement } from "@/lib/inventory-labels/domain/types";

const REF_WIDTH_MM = 50;
const REF_HEIGHT_MM = 30;

/** Padding contenuto dal bordo etichetta (mm). */
export function labelMarginMm(widthMm: number, heightMm: number): number {
  if (widthMm <= 40 && heightMm <= 20) return 2;
  if (widthMm < 55 || heightMm < 35) return 2.5;
  return 3;
}

/** Scala tipografica vs preset riferimento 50×30. */
export function labelFontScale(widthMm: number, heightMm: number): number {
  return Math.sqrt((widthMm * heightMm) / (REF_WIDTH_MM * REF_HEIGHT_MM));
}

function scaledFontPt(basePt: number, scale: number, minPt: number, maxPt: number): number {
  return Math.round(Math.min(maxPt, Math.max(minPt, basePt * scale)) * 2) / 2;
}

const GAP_MM = 1.5;
const TEXT_GAP_MM = 0.1;
const BARCODE_GAP_MM = 0.6;
/** Inset inferiore QR — spazio bianco sopra il barcode senza muovere i bordi esterni. */
const QR_BOTTOM_INSET_MM = 1.5;
const CUT_BORDER_MM = 0.25;

/** Altezza riga testo in mm (allineata al rendering SVG `dominant-baseline=hanging`). */
export function fontLineHeightMm(fontPt: number, factor = 1.2): number {
  return (fontPt / 72) * 25.4 * factor;
}

function barcodeHeightMm(widthMm: number, heightMm: number): number {
  const s = labelFontScale(widthMm, heightMm);
  return Math.min(6.5, Math.max(3.5, 4.5 * s));
}

/** QR quadrato: top/left al margine; lascia `QR_BOTTOM_INSET_MM` sopra il barcode. */
function qrSizeMm(contentBottomMm: number, marginMm: number): number {
  return Math.max(6, contentBottomMm - marginMm - QR_BOTTOM_INSET_MM);
}

/**
 * QR sinistra · colonna destra: marche, desc, codici OE · fornitore alt in fascia barcode · barcode sotto QR.
 */
export function computeLabelLayout(widthMm: number, heightMm: number): LabelTemplateElement[] {
  const m = labelMarginMm(widthMm, heightMm);
  const innerW = widthMm - m * 2;
  const scale = labelFontScale(widthMm, heightMm);
  const primaryPt = scaledFontPt(7, scale, 7, 16);
  const altPt = scaledFontPt(7, scale, 5.5, 10);
  const barcodeH = barcodeHeightMm(widthMm, heightMm);
  const barcodeY = heightMm - m - barcodeH;
  const labelBottomMm = heightMm - m;
  const topGroupBottomMm = barcodeY - BARCODE_GAP_MM;

  const qr = qrSizeMm(topGroupBottomMm, m);
  const textX = m + qr + GAP_MM;
  const textW = Math.max(10, innerW - qr - GAP_MM);

  return [
    { type: "qr", xMm: m, yMm: m, sizeMm: qr },
    {
      type: "text",
      field: "marca",
      xMm: textX,
      yMm: m,
      fontPt: primaryPt,
      maxLines: 3,
      maxWidthMm: textW,
      zoneBottomMm: topGroupBottomMm,
    },
    {
      type: "text",
      field: "descrizione",
      xMm: textX,
      yMm: m,
      fontPt: primaryPt,
      maxWidthMm: textW,
      zoneBottomMm: topGroupBottomMm,
    },
    {
      type: "text",
      field: "codice",
      xMm: textX,
      yMm: m,
      fontPt: primaryPt,
      font: "mono",
      maxWidthMm: textW,
      zoneBottomMm: topGroupBottomMm,
    },
    {
      type: "text",
      field: "codiceSecondario",
      xMm: textX,
      yMm: m,
      fontPt: primaryPt,
      font: "mono",
      maxWidthMm: textW,
      zoneBottomMm: topGroupBottomMm,
    },
    {
      type: "text",
      field: "fornitoreAlternativo",
      xMm: textX,
      yMm: barcodeY,
      fontPt: altPt,
      maxWidthMm: textW,
      zoneBottomMm: labelBottomMm,
    },
    {
      type: "text",
      field: "codiceAlternativo",
      xMm: textX,
      yMm: barcodeY,
      fontPt: altPt,
      font: "mono",
      maxWidthMm: textW,
      zoneBottomMm: labelBottomMm,
    },
    {
      type: "barcode",
      field: "codice",
      format: "code128",
      xMm: m,
      yMm: barcodeY,
      heightMm: barcodeH,
      widthMm: qr,
    },
  ];
}

function buildTemplate(id: string, widthMm: number, heightMm: number): LabelTemplateDefinition {
  return {
    id,
    version: "1.6.4",
    widthMm,
    heightMm,
    dpi: 300,
    cutBorderMm: CUT_BORDER_MM,
    elements: computeLabelLayout(widthMm, heightMm),
  };
}

/** Preset registry — 40×20 … 80×50 mm (incl. 80×40). */
export const LABEL_TEMPLATE_REGISTRY: Record<string, LabelTemplateDefinition> = {
  "40x20-default": buildTemplate("40x20-default", 40, 20),
  "50x30-default": buildTemplate("50x30-default", 50, 30),
  "60x40-default": buildTemplate("60x40-default", 60, 40),
  "70x50-default": buildTemplate("70x50-default", 70, 50),
  "80x40-default": buildTemplate("80x40-default", 80, 40),
  "80x50-default": buildTemplate("80x50-default", 80, 50),
};

/** Default 60×40 — QR scannabile e margini adeguati su stampa comune. */
export const DEFAULT_LABEL_PRESET = "60x40-default";

export const LABEL_PRESET_IDS = Object.keys(LABEL_TEMPLATE_REGISTRY);

export function getLabelTemplate(presetId: string): LabelTemplateDefinition | null {
  return LABEL_TEMPLATE_REGISTRY[presetId] ?? null;
}

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

export function ptToPx(pt: number, dpi: number): number {
  return Math.round((pt / 72) * dpi);
}

export const LABEL_CODICE_BARCODE_GAP_MM = BARCODE_GAP_MM;
