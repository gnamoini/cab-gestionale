import type {
  LabelLayoutMode,
  LabelTemplateDefinition,
  LabelTemplateElement,
  LabelTypography,
  SupplierLayoutMode,
} from "@/lib/inventory-labels/domain/types";
import { DEFAULT_LABEL_TYPOGRAPHY } from "@/lib/inventory-labels/domain/types";
import { computeVerticalStackLayout } from "@/lib/inventory-labels/render/vertical-layout";

const REF_WIDTH_MM = 50;
const REF_HEIGHT_MM = 30;

/** Padding contenuto dal bordo etichetta (mm). */
export function labelMarginMm(widthMm: number, heightMm: number): number {
  if (widthMm <= 40 && heightMm <= 20) return 3;
  if (widthMm < 55 || heightMm < 35) return 3.5;
  return 4;
}

/** Scala tipografica vs preset riferimento 50×30. */
export function labelFontScale(widthMm: number, heightMm: number): number {
  return Math.sqrt((widthMm * heightMm) / (REF_WIDTH_MM * REF_HEIGHT_MM));
}

function scaledFontPt(basePt: number, scale: number, minPt: number, maxPt: number): number {
  return Math.round(Math.min(maxPt, Math.max(minPt, basePt * scale)) * 2) / 2;
}

const GAP_MM = 1.5;
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
function qrSizeMm(contentBottomMm: number, marginMm: number, maxSizeMm?: number): number {
  const computed = Math.max(6, contentBottomMm - marginMm - QR_BOTTOM_INSET_MM);
  if (maxSizeMm != null) return Math.min(computed, maxSizeMm);
  return computed;
}

function applyTypographyPt(basePt: number, typography: LabelTypography): number {
  return Math.round(basePt * typography.scale * 2) / 2;
}

/**
 * QR sinistra · colonna destra: marche, desc, codici OE · fornitore alt in fascia barcode · barcode sotto QR.
 */
export function computeLabelLayout(
  widthMm: number,
  heightMm: number,
  typography: LabelTypography = DEFAULT_LABEL_TYPOGRAPHY,
  qrMaxSizeMm?: number,
): LabelTemplateElement[] {
  const m = labelMarginMm(widthMm, heightMm);
  const innerW = widthMm - m * 2;
  const scale = labelFontScale(widthMm, heightMm) * typography.scale;
  const primaryPt = applyTypographyPt(scaledFontPt(7, scale / typography.scale, 7, 16), typography);
  const altPt = applyTypographyPt(scaledFontPt(7, scale / typography.scale, 5.5, 10), typography);
  const barcodeH = barcodeHeightMm(widthMm, heightMm);
  const barcodeY = heightMm - m - barcodeH;
  const labelBottomMm = heightMm - m;
  const topGroupBottomMm = barcodeY - BARCODE_GAP_MM;

  const qr = qrSizeMm(topGroupBottomMm, m, qrMaxSizeMm);
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
      field: "marcaSecondaria",
      xMm: textX,
      yMm: m,
      fontPt: primaryPt,
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

type BuildTemplateOptions = {
  typography?: LabelTypography;
  layoutMode?: LabelLayoutMode;
  supplierLayout?: SupplierLayoutMode;
  qrMaxSizeMm?: number;
  version?: string;
};

function buildTemplate(
  id: string,
  widthMm: number,
  heightMm: number,
  options?: BuildTemplateOptions,
): LabelTemplateDefinition {
  const marginsMm = labelMarginMm(widthMm, heightMm);
  const typography = options?.typography ?? DEFAULT_LABEL_TYPOGRAPHY;
  const layoutMode = options?.layoutMode ?? "horizontal-qr-left";
  const supplierLayout = options?.supplierLayout ?? "inline-slash";
  const qrMaxSizeMm = options?.qrMaxSizeMm ?? 999;
  const elements =
    layoutMode === "vertical-stack"
      ? computeVerticalStackLayout(widthMm, heightMm, marginsMm, typography, qrMaxSizeMm)
      : computeLabelLayout(widthMm, heightMm, typography, qrMaxSizeMm);
  const barcodeEl = elements.find((e) => e.type === "barcode");
  const barcodeH = barcodeEl?.type === "barcode" ? barcodeEl.heightMm : barcodeHeightMm(widthMm, heightMm);

  return {
    id,
    version: options?.version ?? "1.7.0",
    widthMm,
    heightMm,
    dpi: 300,
    marginsMm,
    cutBorderMm: CUT_BORDER_MM,
    typography,
    layoutMode,
    supplierLayout,
    qr: { maxSizeMm: qrMaxSizeMm, position: layoutMode === "vertical-stack" ? "top-center" : "top-left" },
    barcode: { heightMm: barcodeH },
    elements,
  };
}

/** Preset registry — 40×20 … 95×40 mm + A4 pagina intera. */
export const LABEL_TEMPLATE_REGISTRY: Record<string, LabelTemplateDefinition> = {
  "40x20-default": buildTemplate("40x20-default", 40, 20),
  "50x30-default": buildTemplate("50x30-default", 50, 30),
  "60x40-default": buildTemplate("60x40-default", 60, 40),
  "70x50-default": buildTemplate("70x50-default", 70, 50),
  "80x40-default": buildTemplate("80x40-default", 80, 40),
  "80x50-default": buildTemplate("80x50-default", 80, 50),
  "95x40-default": buildTemplate("95x40-default", 95, 40),
  "a4-pagina-intera": buildTemplate("a4-pagina-intera", 287, 200, {
    typography: { scale: 2.3, weight: "bold", tracking: 0, lineHeight: 1.15 },
    supplierLayout: "inline-slash",
    qrMaxSizeMm: 72,
    version: "2.0.0",
  }),
};

/** Default 95×40 — formato etichetta magazzino preferito. */
export const DEFAULT_LABEL_PRESET = "95x40-default";

export const LABEL_PRESET_IDS = Object.keys(LABEL_TEMPLATE_REGISTRY);

/** Es. `60x40-default` → `60 × 40 mm`. */
export function labelPresetDisplayName(presetId: string): string {
  if (presetId === "a4-pagina-intera") return "A4 · orizzontale";
  return `${presetId.replace(/-default$/, "").replace(/x/g, " × ")} mm`;
}

export function labelPresetOptionLabel(presetId: string): string {
  const name = labelPresetDisplayName(presetId);
  if (presetId === "a4-pagina-intera") return `${name} · lettura da lontano`;
  return presetId === DEFAULT_LABEL_PRESET ? `${name} · consigliato` : name;
}

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
