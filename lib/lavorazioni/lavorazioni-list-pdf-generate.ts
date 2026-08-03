import { jsPDF, type jsPDF as JsPDFDoc } from "jspdf";
import { comparePrioritaLavorazione } from "@/lib/lavorazioni/priorita-order";
import type { LavorazioniInCorsoPdfRow } from "@/lib/lavorazioni/lavorazioni-list-pdf";
import {
  drawPdfBrandBlock,
  drawGestionaleDataSectionTable,
  fmtDateIt,
  pdfContentWidth,
} from "@/lib/pdf/core/pdf-base-template";

/** Margini verticali foglio A4 landscape — più compatti del template standard (non celle). */
const LAV_PDF_MARGIN_TOP = 6;
const LAV_PDF_HEADER_TO_TABLE_GAP = 1;
const LAV_PDF_TABLE_PAGE_MARGIN_TOP = 8;
const LAV_PDF_TABLE_PAGE_MARGIN_BOTTOM = 5;
const LAV_PDF_FOOTER_BOTTOM_OFFSET = 4;

const C_PRIMARY: [number, number, number] = [24, 24, 27];
const C_SECONDARY: [number, number, number] = [82, 82, 91];
const C_MUTED: [number, number, number] = [113, 113, 122];

function safeText(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t || "—";
}

function pdfCellText(v: string | null | undefined): string {
  return (v ?? "").trim();
}

function sortPdfRows(rows: readonly LavorazioniInCorsoPdfRow[]): LavorazioniInCorsoPdfRow[] {
  return [...rows].sort((a, b) => {
    const p = comparePrioritaLavorazione(b.prioritaSortKey, a.prioritaSortKey);
    if (p !== 0) return p;
    return safeText(a.cliente).localeCompare(safeText(b.cliente), "it");
  });
}

function lavorazioniPdfColumnStyles(contentW: number) {
  const base = [46, 54, 38, 34, 26, 49] as const;
  const sum = base.reduce((acc, w) => acc + w, 0);
  const scale = contentW / sum;
  return {
    0: { cellWidth: base[0] * scale, halign: "left" as const },
    1: { cellWidth: base[1] * scale, halign: "left" as const },
    2: { cellWidth: base[2] * scale, halign: "left" as const, fontSize: 8.5 },
    3: { cellWidth: base[3] * scale, halign: "left" as const },
    4: { cellWidth: base[4] * scale, halign: "left" as const },
    5: { cellWidth: base[5] * scale, halign: "left" as const },
  };
}

function drawLavorazioniInCorsoPdfHeader(
  doc: JsPDFDoc,
  pageW: number,
  logoDataUrl: string | null,
  dataLabel: string,
): number {
  let y = LAV_PDF_MARGIN_TOP;

  y = drawPdfBrandBlock(doc, pageW, y, logoDataUrl);
  y += 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C_PRIMARY);
  doc.text("LAVORAZIONI IN CORSO", pageW / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C_SECONDARY);
  doc.text(dataLabel, pageW / 2, y, { align: "center" });
  y += 4;

  return y + 2;
}

function drawLavorazioniInCorsoPdfFooters(doc: JsPDFDoc, numero: string): void {
  const pageCount = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const footerY = pageH - LAV_PDF_FOOTER_BOTTOM_OFFSET;
  const numeroClean = numero.trim();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C_MUTED);
    const footer = numeroClean ? `${numeroClean} · Pag. ${i}/${pageCount}` : `Pag. ${i}/${pageCount}`;
    doc.text(footer, 22, footerY);
  }
}

export function buildLavorazioniInCorsoPdfFileName(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `lavorazioni_in_corso_${y}${m}${day}.pdf`;
}

/** Generazione server-safe lista lavorazioni in corso (A4 landscape). */
export function generateLavorazioniInCorsoPdfBytes(
  rows: readonly LavorazioniInCorsoPdfRow[],
  logoDataUrl: string | null,
): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pdfContentWidth(pageW);
  const nowIso = new Date().toISOString();

  let y = drawLavorazioniInCorsoPdfHeader(doc, pageW, logoDataUrl, fmtDateIt(nowIso));
  y += LAV_PDF_HEADER_TO_TABLE_GAP;

  const ordered = sortPdfRows(rows);
  const body = ordered.map((row) => [
    pdfCellText(row.cliente) || "—",
    safeText(row.attrezzatura),
    pdfCellText(row.identificazione),
    safeText(row.stato),
    safeText(row.priorita),
    safeText(row.addetto),
  ]);

  drawGestionaleDataSectionTable(
    doc,
    y,
    pageW,
    "TABELLA LAVORAZIONI",
    ["Cliente", "Attrezzatura", "Identificazione", "Stato", "Priorità", "Addetto"],
    body,
    lavorazioniPdfColumnStyles(contentW),
    undefined,
    {
      marginTop: LAV_PDF_TABLE_PAGE_MARGIN_TOP,
      marginBottom: LAV_PDF_TABLE_PAGE_MARGIN_BOTTOM,
    },
  );

  drawLavorazioniInCorsoPdfFooters(doc, "Lavorazioni in corso");
  const buf = doc.output("arraybuffer");
  return new Uint8Array(buf);
}
