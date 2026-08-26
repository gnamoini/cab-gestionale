import { MM_TO_PT } from "@/lib/mezzo-labels/domain/types";

/** Single geometry source of truth for mezzo keychain labels (50×22 mm). */
export type MezzoLabelTemplate = {
  id: string;
  version: string;
  dpi: number;
  widthMm: number;
  heightMm: number;
  safeMarginMm: number;
  qr: { xMm: number; yMm: number; sizeMm: number };
  textArea: { xMm: number; widthMm: number };
  logo: { xMm: number; yMm: number; maxWidthMm: number; maxHeightMm: number };
  scuderia: { fontPt: number; lineHeight: number };
  targa: { fontPt: number; lineHeight: number };
};

export const MEZZO_LABEL_TEMPLATE: MezzoLabelTemplate = {
  id: "mezzo-keychain-50x22",
  version: "1.0.0",
  dpi: 300,
  widthMm: 50,
  heightMm: 22,
  safeMarginMm: 2,
  qr: { xMm: 2, yMm: 1, sizeMm: 20 },
  textArea: { xMm: 24, widthMm: 24 },
  logo: { xMm: 24, yMm: 1.5, maxWidthMm: 22, maxHeightMm: 5 },
  scuderia: { fontPt: 5, lineHeight: 1.15 },
  targa: { fontPt: 9, lineHeight: 1.1 },
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
