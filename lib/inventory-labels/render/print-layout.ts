import type { LabelTemplateDefinition } from "@/lib/inventory-labels/domain/types";

export type A4GridLayout = {
  cols: number;
  rows: number;
  marginMm: number;
  gapMm: number;
};

/** Dimensioni foglio A4 per griglia PDF (portrait default; A4 full-page = landscape). */
export function labelPdfPageSizeMm(template: LabelTemplateDefinition): {
  widthMm: number;
  heightMm: number;
  orientation: "portrait" | "landscape";
} {
  if (template.id === "a4-pagina-intera") {
    return { widthMm: 297, heightMm: 210, orientation: "landscape" };
  }
  return { widthMm: 210, heightMm: 297, orientation: "portrait" };
}

export function computeA4Grid(template: LabelTemplateDefinition, marginMm = 5, gapMm = 2): A4GridLayout {
  const page = labelPdfPageSizeMm(template);
  const usableW = page.widthMm - marginMm * 2;
  const usableH = page.heightMm - marginMm * 2;
  const cols = Math.max(1, Math.floor((usableW + gapMm) / (template.widthMm + gapMm)));
  const rows = Math.max(1, Math.floor((usableH + gapMm) / (template.heightMm + gapMm)));
  return { cols, rows, marginMm, gapMm };
}

export function labelsPerA4Page(template: LabelTemplateDefinition): number {
  const g = computeA4Grid(template);
  return g.cols * g.rows;
}
