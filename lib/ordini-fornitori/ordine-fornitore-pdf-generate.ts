import { jsPDF } from "jspdf";
import {
  drawGestionalePdfHeader,
  drawPdfPageFooters,
  fmtDateIt,
  pdfAdvanceAfterDocumentHeader,
  drawGestionaleDataSectionTable,
  pdfContentWidth,
} from "@/lib/pdf/core/pdf-base-template";
import { drawGestionaleFieldSectionTable } from "@/lib/pdf/gestionale-section-table";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";

function fmtMoney(n: number): string {
  return n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ordineRowsColumnStyles(contentW: number) {
  const base = [22, 68, 14, 18, 14, 22] as const;
  const sum = base.reduce((acc, w) => acc + w, 0);
  const scale = contentW / sum;
  return {
    0: { cellWidth: base[0] * scale, halign: "left" as const, fontSize: 8.5 },
    1: { cellWidth: base[1] * scale, halign: "left" as const },
    2: { cellWidth: base[2] * scale, halign: "right" as const },
    3: { cellWidth: base[3] * scale, halign: "right" as const },
    4: { cellWidth: base[4] * scale, halign: "right" as const },
    5: { cellWidth: base[5] * scale, halign: "right" as const },
  };
}

export function generateOrdineFornitorePdfBytes(
  record: OrdineFornitoreRecord,
  logoDataUrl: string | null,
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pdfContentWidth(pageW);
  const num = record.numero || "—";

  let y = drawGestionalePdfHeader(doc, pageW, "ORDINE A FORNITORE", {
    numero: num,
    data: fmtDateIt(record.dataOrdine),
    logoDataUrl,
  });
  y = pdfAdvanceAfterDocumentHeader(y);

  y = drawGestionaleFieldSectionTable(doc, y, pageW, "Fornitore", [
    { label: "Ragione sociale", value: record.fornitoreLabel },
  ]);

  if (record.destinazione?.trim()) {
    y = drawGestionaleFieldSectionTable(doc, y, pageW, "Destinazione merce", [
      { label: "Indirizzo", value: record.destinazione.trim() },
    ]);
  }

  const body = record.righe.map((row) => [
    (row.codice || "—").slice(0, 14),
    row.descrizione,
    String(row.quantita),
    fmtMoney(row.prezzoUnitario),
    row.scontoPercent ? `${row.scontoPercent}%` : "—",
    fmtMoney(row.totaleRiga),
  ]);

  y = drawGestionaleDataSectionTable(
    doc,
    y + 2,
    pageW,
    "Righe ordine",
    ["Codice", "Descrizione", "Q.tà", "Prezzo", "Sc.", "Totale"],
    body,
    ordineRowsColumnStyles(contentW),
  );

  y += 4;
  doc.setFontSize(9);
  const summaryX = pageW - 14;
  const lines = [
    `Imponibile righe: € ${fmtMoney(record.imponibileRighe)}`,
    `Trasporto: € ${fmtMoney(record.trasporto)}`,
    `Imponibile: € ${fmtMoney(record.imponibile)}`,
    `IVA (${record.ivaPercent}%): € ${fmtMoney(record.iva)}`,
    `Totale ordine: € ${fmtMoney(record.totale)}`,
  ];
  for (const line of lines) {
    doc.text(line, summaryX, y, { align: "right" });
    y += 4.5;
  }

  if (record.note?.trim()) {
    y += 2;
    doc.text(`Note: ${record.note.trim().slice(0, 300)}`, 14, y);
    y += 8;
  }

  drawPdfPageFooters(doc, num);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function ordineFornitorePdfFileName(record: OrdineFornitoreRecord): string {
  const safeForn = record.fornitoreLabel.replace(/[^\w\-]+/g, "_").slice(0, 30);
  const safeNum = (record.numero || "ordine").replace("/", "-");
  return `Ordine_${safeNum}_${safeForn}.pdf`;
}
