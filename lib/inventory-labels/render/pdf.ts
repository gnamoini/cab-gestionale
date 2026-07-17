import "server-only";

import { jsPDF } from "jspdf";
import type { LabelPayload, LabelTemplateDefinition } from "@/lib/inventory-labels/domain/types";
import { renderLabelPng } from "@/lib/inventory-labels/render/png";
import { computeA4Grid } from "@/lib/inventory-labels/render/print-layout";

const A4_W_MM = 210;
const A4_H_MM = 297;
const RENDER_CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function renderSingleLabelPdf(
  template: LabelTemplateDefinition,
  payload: LabelPayload,
  qrUrl: string,
): Promise<Uint8Array> {
  const png = await renderLabelPng(template, payload, qrUrl);
  const doc = new jsPDF({
    orientation: template.widthMm > template.heightMm ? "landscape" : "portrait",
    unit: "mm",
    format: [template.widthMm, template.heightMm],
  });
  doc.addImage(new Uint8Array(png), "PNG", 0, 0, template.widthMm, template.heightMm, undefined, "FAST");
  return new Uint8Array(doc.output("arraybuffer"));
}

export async function renderMultiLabelPdf(
  template: LabelTemplateDefinition,
  items: Array<{ payload: LabelPayload; qrUrl: string }>,
): Promise<Uint8Array> {
  const grid = computeA4Grid(template);
  const pngs = await mapWithConcurrency(items, RENDER_CONCURRENCY, (item) =>
    renderLabelPng(template, item.payload, item.qrUrl),
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let col = 0;
  let row = 0;

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && col === 0 && row === 0) doc.addPage();
    const png = pngs[i]!;
    const x = grid.marginMm + col * (template.widthMm + grid.gapMm);
    const y = grid.marginMm + row * (template.heightMm + grid.gapMm);
    doc.addImage(new Uint8Array(png), "PNG", x, y, template.widthMm, template.heightMm, undefined, "FAST");

    col++;
    if (col >= grid.cols) {
      col = 0;
      row++;
    }
    if (row >= grid.rows) {
      row = 0;
      if (i < items.length - 1) doc.addPage();
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

export { A4_W_MM, A4_H_MM };
