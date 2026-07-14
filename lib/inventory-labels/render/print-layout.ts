import type { LabelTemplateDefinition } from "@/lib/inventory-labels/domain/types";

const A4_W_MM = 210;
const A4_H_MM = 297;

export type A4GridLayout = {
  cols: number;
  rows: number;
  marginMm: number;
  gapMm: number;
};

export function computeA4Grid(template: LabelTemplateDefinition, marginMm = 5, gapMm = 2): A4GridLayout {
  const usableW = A4_W_MM - marginMm * 2;
  const usableH = A4_H_MM - marginMm * 2;
  const cols = Math.max(1, Math.floor((usableW + gapMm) / (template.widthMm + gapMm)));
  const rows = Math.max(1, Math.floor((usableH + gapMm) / (template.heightMm + gapMm)));
  return { cols, rows, marginMm, gapMm };
}

export function labelsPerA4Page(template: LabelTemplateDefinition): number {
  const g = computeA4Grid(template);
  return g.cols * g.rows;
}
