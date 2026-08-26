import { jsPDF } from "jspdf";
import { computeA4Grid } from "@/lib/inventory-labels/render/print-layout";
import type { LabelTemplateDefinition } from "@/lib/inventory-labels/domain/types";
import { mezzoLabelGridTemplate, MEZZO_LABEL_TEMPLATE } from "@/lib/mezzo-labels/domain/template";
import { renderMezzoLabelPng } from "@/lib/mezzo-labels/render/png";
import type { MezzoLabelPayload } from "@/lib/mezzo-labels/domain/types";

export type MezzoLabelPdfSlot = {
  payload: MezzoLabelPayload;
  qrUrl: string;
};

function gridTemplate(): LabelTemplateDefinition {
  const g = mezzoLabelGridTemplate();
  return {
    id: g.id,
    version: MEZZO_LABEL_TEMPLATE.version,
    widthMm: g.widthMm,
    heightMm: g.heightMm,
    dpi: MEZZO_LABEL_TEMPLATE.dpi,
    marginsMm: MEZZO_LABEL_TEMPLATE.safeMarginMm,
    typography: { scale: 1, weight: "normal", tracking: 0, lineHeight: 1.2 },
    layoutMode: "horizontal-qr-left",
    supplierLayout: "inline-slash",
    qr: { maxSizeMm: MEZZO_LABEL_TEMPLATE.qr.sizeMm, position: "top-left" },
    barcode: { heightMm: 0 },
    elements: [],
  };
}

export async function renderMezzoLabelsPdf(slots: MezzoLabelPdfSlot[]): Promise<Uint8Array> {
  if (slots.length === 0) throw new Error("Nessuna etichetta da generare");

  const pngs = await Promise.all(slots.map((s) => renderMezzoLabelPng(s.payload, s.qrUrl)));
  const template = gridTemplate();
  const grid = computeA4Grid(template);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let col = 0;
  let row = 0;

  for (let i = 0; i < slots.length; i++) {
    if (i > 0 && col === 0 && row === 0) doc.addPage("a4", "portrait");
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
      if (i < slots.length - 1) doc.addPage("a4", "portrait");
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function renderSingleMezzoLabelPdf(slot: MezzoLabelPdfSlot): Promise<Uint8Array> {
  return renderMezzoLabelsPdf([slot]);
}
