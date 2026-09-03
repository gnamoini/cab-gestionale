import { MM_TO_PT } from "@/lib/mezzo-labels/domain/types";

/** Single geometry source of truth for mezzo keychain labels (36×18 mm, orizzontale). */
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
  id: "mezzo-keychain-36x18",
  version: "2.2.2",
  dpi: 300,
  widthMm: 36,
  heightMm: 18,
  safeMarginMm: 1,
  cutBorderMm: 1,
  columnGutterMm: 0.35,
  innerPaddingMm: 0.15,
  leftColumnPadMm: 0.1,
  logo: { maxWidthMm: 12, maxHeightMm: 2.2 },
  qr: { maxSizeMm: 13.5 },
  scuderia: { fontPt: 11, minFontPt: 7, lineHeight: 1.08 },
  targa: { fontPt: 11, minFontPt: 7, lineHeight: 1.08 },
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
