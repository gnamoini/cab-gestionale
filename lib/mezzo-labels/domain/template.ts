import { MM_TO_PT } from "@/lib/mezzo-labels/domain/types";

/** Single geometry source of truth for mezzo keychain labels (50×22 mm). */
export type MezzoLabelTemplate = {
  id: string;
  version: string;
  dpi: number;
  widthMm: number;
  heightMm: number;
  safeMarginMm: number;
  /** Margine bianco interno (mm), tra linea di taglio e contenuto. */
  cutBorderMm: number;
  columnGutterMm: number;
  innerPaddingMm: number;
  /** Margine sinistro minimo nella colonna QR (QR il più a sinistra possibile). */
  leftColumnPadMm: number;
  logo: { maxWidthMm: number; maxHeightMm: number };
  qr: { maxSizeMm: number };
  scuderia: { fontPt: number; minFontPt: number; lineHeight: number };
  targa: { fontPt: number; minFontPt: number; lineHeight: number };
};

export const MEZZO_LABEL_TEMPLATE: MezzoLabelTemplate = {
  id: "mezzo-keychain-50x22",
  version: "1.1.4",
  dpi: 300,
  widthMm: 50,
  heightMm: 22,
  safeMarginMm: 2,
  cutBorderMm: 2,
  columnGutterMm: 0.8,
  innerPaddingMm: 0.2,
  leftColumnPadMm: 0.15,
  logo: { maxWidthMm: 16, maxHeightMm: 3.2 },
  qr: { maxSizeMm: 14 },
  scuderia: { fontPt: 11, minFontPt: 6, lineHeight: 1.15 },
  targa: { fontPt: 15, minFontPt: 8, lineHeight: 1.1 },
};

export function mmToPx(mm: number, dpi = MEZZO_LABEL_TEMPLATE.dpi): number {
  return Math.round((mm / 25.4) * dpi);
}

export function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

/** Grid-compatible dimensions for A4 layout (computeA4Grid). */
export function mezzoLabelGridTemplate(): {
  id: string;
  widthMm: number;
  heightMm: number;
} {
  const t = MEZZO_LABEL_TEMPLATE;
  return { id: t.id, widthMm: t.widthMm, heightMm: t.heightMm };
}
