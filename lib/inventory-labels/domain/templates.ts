import type {
  LabelKind,
  LabelLayoutMode,
  LabelTemplateDefinition,
  LabelTemplateElement,
  LabelTypography,
  SupplierLayoutMode,
} from "@/lib/inventory-labels/domain/types";
import { DEFAULT_LABEL_TYPOGRAPHY } from "@/lib/inventory-labels/domain/types";
import { computeVerticalStackLayout } from "@/lib/inventory-labels/render/vertical-layout";
import { CAB_LOGO_PDF_ASPECT } from "@/lib/branding/branding-logo-for-pdf";

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

const A4_QR_SIZE_MM = 58;
const A4_LOGO_QR_GAP_MM = 1.5;
const A4_TEXT_BOTTOM_GAP_MM = 2.5;
const CLIENTE_QR_WEBSITE_GAP_MM = 0.5;

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

/**
 * A4 pagina intera: testi a tutta larghezza in alto · logo+QR in basso a sinistra · barcode/fornitore a destra.
 */
export function computeA4PaginaInteraLayout(
  widthMm: number,
  heightMm: number,
  typography: LabelTypography = DEFAULT_LABEL_TYPOGRAPHY,
): LabelTemplateElement[] {
  const m = labelMarginMm(widthMm, heightMm);
  const innerW = widthMm - m * 2;
  const fontScale = labelFontScale(widthMm, heightMm);
  const primaryPt =
    Math.round(Math.min(48, Math.max(38, fontScale * 7.6 * typography.scale)) * 2) / 2;
  const altPt = Math.round(Math.min(34, Math.max(22, fontScale * 4.2 * typography.scale)) * 2) / 2;
  const barcodeH = barcodeHeightMm(widthMm, heightMm);
  const barcodeY = heightMm - m - barcodeH;
  const labelBottomMm = heightMm - m;

  const qr = A4_QR_SIZE_MM;
  const qrY = labelBottomMm - qr;
  const logoW = qr;
  const logoH = logoW / CAB_LOGO_PDF_ASPECT;
  const logoY = qrY - A4_LOGO_QR_GAP_MM - logoH;
  const bottomBandTopMm = Math.min(logoY, barcodeY) - A4_TEXT_BOTTOM_GAP_MM;
  const supplierX = m + qr + GAP_MM;
  const supplierW = Math.max(10, innerW - qr - GAP_MM);

  return [
    { type: "logo", xMm: m, yMm: logoY, widthMm: logoW, heightMm: logoH },
    { type: "qr", xMm: m, yMm: qrY, sizeMm: qr },
    {
      type: "text",
      field: "marca",
      xMm: m,
      yMm: m,
      fontPt: primaryPt,
      maxLines: 3,
      maxWidthMm: innerW,
      zoneBottomMm: bottomBandTopMm,
    },
    {
      type: "text",
      field: "descrizione",
      xMm: m,
      yMm: m,
      fontPt: primaryPt,
      maxWidthMm: innerW,
      zoneBottomMm: bottomBandTopMm,
    },
    {
      type: "text",
      field: "codice",
      xMm: m,
      yMm: m,
      fontPt: primaryPt,
      font: "mono",
      maxWidthMm: innerW,
      zoneBottomMm: bottomBandTopMm,
    },
    {
      type: "text",
      field: "marcaSecondaria",
      xMm: m,
      yMm: m,
      fontPt: primaryPt,
      maxWidthMm: innerW,
      zoneBottomMm: bottomBandTopMm,
    },
    {
      type: "text",
      field: "codiceSecondario",
      xMm: m,
      yMm: m,
      fontPt: primaryPt,
      font: "mono",
      maxWidthMm: innerW,
      zoneBottomMm: bottomBandTopMm,
    },
    {
      type: "text",
      field: "fornitoreAlternativo",
      xMm: supplierX,
      yMm: barcodeY,
      fontPt: altPt,
      maxWidthMm: supplierW,
      zoneBottomMm: labelBottomMm,
    },
    {
      type: "text",
      field: "codiceAlternativo",
      xMm: supplierX,
      yMm: barcodeY,
      fontPt: altPt,
      font: "mono",
      maxWidthMm: supplierW,
      zoneBottomMm: labelBottomMm,
    },
    {
      type: "barcode",
      field: "codice",
      format: "code128",
      xMm: supplierX,
      yMm: barcodeY,
      heightMm: barcodeH,
      widthMm: supplierW,
    },
  ];
}

const CLIENTE_LOGO_MAX_HEIGHT_MM = 7;
const CLIENTE_LOGO_TEXT_GAP_MM = 1;

function clienteLogoHeightMm(widthMm: number, heightMm: number): number {
  const s = labelFontScale(widthMm, heightMm);
  return Math.min(CLIENTE_LOGO_MAX_HEIGHT_MM, Math.max(4.5, 5.5 * s));
}

const MANUAL_LOGO_TEXT_GAP_MM = 1;

/**
 * Logo centrato in alto · testo marca/desc/codice centrato (no QR, no barcode).
 */
export function computeManualLabelLayout(
  widthMm: number,
  heightMm: number,
  typography: LabelTypography = DEFAULT_LABEL_TYPOGRAPHY,
): LabelTemplateElement[] {
  const m = labelMarginMm(widthMm, heightMm);
  const innerW = widthMm - m * 2;
  const scale = labelFontScale(widthMm, heightMm) * typography.scale;
  const primaryPt = applyTypographyPt(scaledFontPt(7, scale / typography.scale, 7, 16), typography);
  const labelBottomMm = heightMm - m;
  const centerX = widthMm / 2;

  const logoH = clienteLogoHeightMm(widthMm, heightMm);
  const logoW = Math.min(innerW * 0.4, logoH * CAB_LOGO_PDF_ASPECT);
  const logoX = (widthMm - logoW) / 2;
  const textTopMm = m + logoH + MANUAL_LOGO_TEXT_GAP_MM;

  return [
    { type: "logo", xMm: logoX, yMm: m, widthMm: logoW, heightMm: logoH },
    {
      type: "text",
      field: "marca",
      xMm: centerX,
      yMm: textTopMm,
      fontPt: primaryPt,
      maxLines: 3,
      maxWidthMm: innerW,
      zoneBottomMm: labelBottomMm,
      vAlign: "center",
      hAlign: "center",
    },
    {
      type: "text",
      field: "descrizione",
      xMm: centerX,
      yMm: textTopMm,
      fontPt: primaryPt,
      maxWidthMm: innerW,
      zoneBottomMm: labelBottomMm,
      vAlign: "center",
      hAlign: "center",
    },
    {
      type: "text",
      field: "codice",
      xMm: centerX,
      yMm: textTopMm,
      fontPt: primaryPt,
      font: "mono",
      maxWidthMm: innerW,
      zoneBottomMm: labelBottomMm,
      vAlign: "center",
      hAlign: "center",
    },
  ];
}

/**
 * QR sinistra · logo + marca/desc/codice a destra — etichetta cliente (no barcode, no secondari).
 */
export function computeClienteLabelLayout(
  widthMm: number,
  heightMm: number,
  typography: LabelTypography = DEFAULT_LABEL_TYPOGRAPHY,
  qrMaxSizeMm?: number,
): LabelTemplateElement[] {
  const m = labelMarginMm(widthMm, heightMm);
  const innerW = widthMm - m * 2;
  const scale = labelFontScale(widthMm, heightMm) * typography.scale;
  const primaryPt = applyTypographyPt(scaledFontPt(7, scale / typography.scale, 7, 16), typography);
  const websitePt = applyTypographyPt(scaledFontPt(5, scale / typography.scale, 4, 7), typography);
  const websiteBlockMm = fontLineHeightMm(websitePt) + CLIENTE_QR_WEBSITE_GAP_MM;
  const labelBottomMm = heightMm - m;

  const qrMaxH = heightMm - m * 2 - websiteBlockMm;
  const qr = qrMaxSizeMm != null ? Math.min(qrMaxH, qrMaxSizeMm) : qrMaxH;
  const textX = m + qr + GAP_MM;
  const textW = Math.max(10, innerW - qr - GAP_MM);
  const logoH = clienteLogoHeightMm(widthMm, heightMm);
  const logoW = Math.min(textW, logoH * CAB_LOGO_PDF_ASPECT);
  const textTopMm = m + logoH + CLIENTE_LOGO_TEXT_GAP_MM;

  return [
    { type: "qr", xMm: m, yMm: m, sizeMm: qr },
    {
      type: "text",
      literalSource: "clienteWebsite",
      xMm: m + qr / 2,
      yMm: m + qr + CLIENTE_QR_WEBSITE_GAP_MM,
      fontPt: websitePt,
      maxWidthMm: qr,
      hAlign: "center",
    },
    { type: "logo", xMm: textX, yMm: m, widthMm: logoW, heightMm: logoH },
    {
      type: "text",
      field: "marca",
      xMm: textX,
      yMm: textTopMm,
      fontPt: primaryPt,
      maxLines: 3,
      maxWidthMm: textW,
      zoneBottomMm: labelBottomMm,
    },
    {
      type: "text",
      field: "descrizione",
      xMm: textX,
      yMm: textTopMm,
      fontPt: primaryPt,
      maxWidthMm: textW,
      zoneBottomMm: labelBottomMm,
    },
    {
      type: "text",
      field: "codice",
      xMm: textX,
      yMm: textTopMm,
      fontPt: primaryPt,
      font: "mono",
      maxWidthMm: textW,
      zoneBottomMm: labelBottomMm,
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

function buildClienteTemplate(base: LabelTemplateDefinition): LabelTemplateDefinition {
  const { widthMm, heightMm, typography, qr } = base;
  const marginsMm = labelMarginMm(widthMm, heightMm);
  const elements = computeClienteLabelLayout(widthMm, heightMm, typography, qr.maxSizeMm);
  return {
    ...base,
    id: `${base.id}-cliente`,
    version: "1.8.1-cliente",
    marginsMm,
    layoutMode: "horizontal-qr-left",
    elements,
    barcode: { heightMm: 0 },
  };
}

function buildManualTemplate(base: LabelTemplateDefinition): LabelTemplateDefinition {
  const { widthMm, heightMm, typography } = base;
  const marginsMm = labelMarginMm(widthMm, heightMm);
  const elements = computeManualLabelLayout(widthMm, heightMm, typography);
  return {
    ...base,
    id: `${base.id}-manual`,
    version: "1.9.0-manual",
    marginsMm,
    layoutMode: "manual-centered",
    elements,
    barcode: { heightMm: 0 },
    qr: { maxSizeMm: 0, position: "top-left" },
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
  "a4-pagina-intera": (() => {
    const widthMm = 287;
    const heightMm = 200;
    const marginsMm = labelMarginMm(widthMm, heightMm);
    const typography: LabelTypography = { scale: 1, weight: "bold", tracking: 0, lineHeight: 1.1 };
    const elements = computeA4PaginaInteraLayout(widthMm, heightMm, typography);
    const barcodeEl = elements.find((e) => e.type === "barcode");
    const barcodeH = barcodeEl?.type === "barcode" ? barcodeEl.heightMm : barcodeHeightMm(widthMm, heightMm);
    return {
      id: "a4-pagina-intera",
      version: "2.1.0",
      widthMm,
      heightMm,
      dpi: 300,
      marginsMm,
      cutBorderMm: CUT_BORDER_MM,
      typography,
      layoutMode: "horizontal-qr-left" as const,
      supplierLayout: "inline-slash" as const,
      qr: { maxSizeMm: A4_QR_SIZE_MM, position: "top-left" as const },
      barcode: { heightMm: barcodeH },
      elements,
    };
  })(),
};

/** Default 95×40 — formato etichetta magazzino preferito. */
export const DEFAULT_LABEL_PRESET = "95x40-default";

export const LABEL_PRESET_IDS = Object.keys(LABEL_TEMPLATE_REGISTRY);

/** Preset etichetta manuale — esclude A4 pagina intera. */
export const MANUAL_LABEL_PRESET_IDS = LABEL_PRESET_IDS.filter((id) => id !== "a4-pagina-intera");

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

export function getLabelTemplate(presetId: string, kind: LabelKind = "internal"): LabelTemplateDefinition | null {
  const base = LABEL_TEMPLATE_REGISTRY[presetId];
  if (!base) return null;
  if (kind === "manual") {
    if (presetId === "a4-pagina-intera") return null;
    return buildManualTemplate(base);
  }
  if (kind === "cliente") return buildClienteTemplate(base);
  return base;
}

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

export function ptToPx(pt: number, dpi: number): number {
  return Math.round((pt / 72) * dpi);
}

export const LABEL_CODICE_BARCODE_GAP_MM = BARCODE_GAP_MM;
