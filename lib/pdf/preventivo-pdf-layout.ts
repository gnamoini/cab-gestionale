import type { jsPDF } from "jspdf";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export {
  buildPreventivoAttrezzaturaPdfFields,
  buildPreventivoClientePdfFields as buildAnagraficaPdfFields,
  buildPreventivoMezzoPdfFields,
  buildPreventivoTelaioMezzoPdfFields,
  inferTipoAttrezzaturaPdfLegacy as inferTipoAttrezzaturaPdf,
} from "@/lib/pdf/anagrafica-pdf-fields";
import {
  buildPreventivoAttrezzaturaPdfFields,
  buildPreventivoTelaioMezzoPdfFields,
} from "@/lib/pdf/anagrafica-pdf-fields";

/** @deprecated Usare buildPreventivoAttrezzaturaPdfFields + buildPreventivoTelaioMezzoPdfFields */
export function buildAttrezzaturaPdfFields(p: PreventivoRecord): PdfField[] {
  return [...buildPreventivoAttrezzaturaPdfFields(p), ...buildPreventivoTelaioMezzoPdfFields(p)];
}

/** Margini A4 ottimizzati per stampa (mm). */
export const PDF_MARGIN_L = 22;
export const PDF_MARGIN_R = 22;
export const PDF_MARGIN_TOP = 18;
export const PDF_FOOTER_Y = 287;

/** Spaziatura verticale tra sezioni principali del documento (mm). */
export const PDF_SECTION_GAP = 5.5;
/** Spazio tra titolo sezione e contenuto (mm). */
export const PDF_SECTION_CONTENT_GAP = 2;

export const PDF_COMPANY_NAME = "CENTRO ASSISTENZA BARI SRL";

/** Aliquota IVA predefinita per riepilogo documento (imponibile = totale finale calcolato). */
export const PDF_PREVENTIVO_IVA_PERCENT = 22;

const C_PRIMARY: [number, number, number] = [24, 24, 27];
const C_SECONDARY: [number, number, number] = [82, 82, 91];
const C_MUTED: [number, number, number] = [113, 113, 122];
const C_RULE: [number, number, number] = [212, 212, 216];
const C_TABLE_HEAD: [number, number, number] = [248, 250, 252];

export type PdfField = { label: string; value: string };

export function pdfContentWidth(pageW: number): number {
  return pageW - PDF_MARGIN_L - PDF_MARGIN_R;
}

export function fmtEuroPdf(n: number): string {
  return `${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function fmtDateIt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function cleanField(v: string | undefined | null): string | undefined {
  const t = String(v ?? "").trim();
  if (!t || t === "—") return undefined;
  return t;
}

export function buildTelaioPdfFields(p: PreventivoRecord): PdfField[] {
  const targa = cleanField(p.targa);
  if (!targa) return [];
  return [{ label: "Targa", value: targa }];
}

export function buildIdentificazioneDocumentoPdfFields(
  p: PreventivoRecord,
  operatoreFallback: string,
): PdfField[] {
  const out: PdfField[] = [];
  const numero = cleanField(p.numero);
  if (numero) out.push({ label: "N.", value: numero });
  if (p.dataCreazione) out.push({ label: "Data", value: fmtDateIt(p.dataCreazione) });
  const operatore = cleanField(p.lastEditedBy) ?? cleanField(operatoreFallback);
  if (operatore) out.push({ label: "Operatore", value: operatore });
  return out;
}

export function drawPdfHorizontalRule(doc: jsPDF, y: number, pageW: number): number {
  doc.setDrawColor(...C_RULE);
  doc.setLineWidth(0.25);
  doc.line(PDF_MARGIN_L, y, pageW - PDF_MARGIN_R, y);
  return y + 4.5;
}

export function pdfAdvanceSection(y: number, gap = PDF_SECTION_GAP): number {
  return y + gap;
}

export type PreventivoPdfHeaderMeta = {
  numero?: string;
  data?: string;
  operatore?: string;
};

/** Intestazione aziendale + tipo documento + metadati documento su una riga. */
export function drawPreventivoPdfHeader(
  doc: jsPDF,
  pageW: number,
  tipoDocumentoUpper: string,
  meta?: PreventivoPdfHeaderMeta,
): number {
  let y = PDF_MARGIN_TOP;
  const cw = pdfContentWidth(pageW);

  doc.setTextColor(...C_PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const companyLines = doc.splitTextToSize(PDF_COMPANY_NAME, cw) as string[];
  for (const line of companyLines) {
    doc.text(line, pageW / 2, y, { align: "center" });
    y += 5.5;
  }

  y += 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...C_PRIMARY);
  doc.text(tipoDocumentoUpper, pageW / 2, y, { align: "center" });
  y += 5.5;

  const metaParts = [
    meta?.numero ? `N. ${meta.numero}` : null,
    meta?.data || null,
    meta?.operatore || null,
  ].filter((part): part is string => Boolean(part));
  if (metaParts.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...C_SECONDARY);
    doc.text(metaParts.join("  |  "), pageW / 2, y, { align: "center" });
    y += 5;
  }

  y += 2;
  return drawPdfHorizontalRule(doc, y, pageW);
}

export function drawPdfSectionTitle(doc: jsPDF, y: number, pageW: number, title: string): number {
  y += 1.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.25);
  doc.setTextColor(...C_PRIMARY);
  doc.text(title.toUpperCase(), PDF_MARGIN_L, y);
  y += 4.5;
  return drawPdfHorizontalRule(doc, y, pageW);
}

/** Griglia etichetta / valore — omette campi vuoti. */
export function drawPdfFieldGrid(doc: jsPDF, startY: number, pageW: number, fields: PdfField[]): number {
  if (!fields.length) return startY;
  const colW = pdfContentWidth(pageW) / 2 - 4;
  const lineH = 4.5;
  let y = startY + PDF_SECTION_CONTENT_GAP;
  doc.setFontSize(8.5);

  for (let i = 0; i < fields.length; i += 2) {
    const left = fields[i]!;
    const right = fields[i + 1];

    const drawCell = (x: number, field: PdfField): number => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C_MUTED);
      doc.setFontSize(7);
      doc.text(field.label.toUpperCase(), x, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C_PRIMARY);
      doc.setFontSize(9);
      const valLines = doc.splitTextToSize(field.value, colW) as string[];
      doc.text(valLines, x, y + 3.4);
      return valLines.length;
    };

    const leftLines = drawCell(PDF_MARGIN_L, left);
    const rightLines = right ? drawCell(PDF_MARGIN_L + colW + 12, right) : 0;
    y += 3.4 + Math.max(leftLines, rightLines, 1) * lineH + 4;
  }

  return y + 1.5;
}

/** Blocco full-width: etichetta + paragrafo (note, testi lunghi). Label vuota = solo paragrafo. */
export function drawPdfLabeledParagraph(
  doc: jsPDF,
  startY: number,
  pageW: number,
  label: string,
  value: string,
): number {
  const text = value.trim();
  if (!text) return startY;

  const cw = pdfContentWidth(pageW);
  const lineH = 4.5;
  let y = startY + PDF_SECTION_CONTENT_GAP;
  const labelTrim = label.trim();

  if (labelTrim) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C_MUTED);
    doc.setFontSize(7);
    doc.text(labelTrim.toUpperCase(), PDF_MARGIN_L, y);
    y += 3.4;
  }

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C_PRIMARY);
  doc.setFontSize(9);
  const valLines = doc.splitTextToSize(text, cw) as string[];
  doc.text(valLines, PDF_MARGIN_L, y);
  y += Math.max(valLines.length, 1) * lineH + 4;

  return y + 1.5;
}

function estimatePdfFieldGridHeight(fieldCount: number): number {
  if (fieldCount <= 0) return 0;
  const rows = Math.ceil(fieldCount / 2);
  const lineH = 4.5;
  return PDF_SECTION_CONTENT_GAP + rows * (3.4 + lineH + 4) + 1.5;
}

function estimatePdfLabeledParagraphHeight(doc: jsPDF, pageW: number, label: string, value: string): number {
  const text = value.trim();
  if (!text) return 0;
  const cw = pdfContentWidth(pageW);
  const lineH = 4.5;
  const labelTrim = label.trim();
  let h = PDF_SECTION_CONTENT_GAP;
  if (labelTrim) h += 3.4;
  doc.setFontSize(9);
  const valLines = doc.splitTextToSize(text, cw) as string[];
  h += Math.max(valLines.length, 1) * lineH + 4 + 1.5;
  return h;
}

/** Sezione con titolo + pannello (sfondo/bordo) + griglia campi. */
export function drawPdfSectionPanelGrid(
  doc: jsPDF,
  startY: number,
  pageW: number,
  title: string,
  fields: PdfField[],
): number {
  if (!fields.length) return startY;

  const pad = 3.5;
  const boxW = pdfContentWidth(pageW);
  const gridH = estimatePdfFieldGridHeight(fields.length);
  const boxH = gridH + pad * 2;

  let y = ensurePdfSpace(doc, startY, 34 + boxH);
  y = drawPdfSectionTitle(doc, y, pageW, title);

  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(...C_RULE);
  doc.setLineWidth(0.25);
  doc.roundedRect(PDF_MARGIN_L, y, boxW, boxH, 2, 2, "FD");

  const contentEnd = drawPdfFieldGrid(doc, y + pad, pageW, fields);
  return pdfAdvanceSection(Math.max(contentEnd, y + boxH));
}

/** Sezione con titolo + pannello + paragrafi full-width (note). */
export function drawPdfSectionPanelParagraphs(
  doc: jsPDF,
  startY: number,
  pageW: number,
  title: string,
  fields: PdfField[],
): number {
  if (!fields.length) return startY;

  const pad = 3.5;
  const boxW = pdfContentWidth(pageW);
  let innerH = 0;
  for (const f of fields) {
    innerH += estimatePdfLabeledParagraphHeight(doc, pageW, f.label, f.value);
  }
  const boxH = innerH + pad * 2;

  let y = ensurePdfSpace(doc, startY, 34 + boxH);
  y = drawPdfSectionTitle(doc, y, pageW, title);

  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(...C_RULE);
  doc.setLineWidth(0.25);
  doc.roundedRect(PDF_MARGIN_L, y, boxW, boxH, 2, 2, "FD");

  let innerY = y + pad;
  for (const field of fields) {
    innerY = drawPdfLabeledParagraph(doc, innerY, pageW, field.label, field.value);
  }
  return pdfAdvanceSection(Math.max(innerY + pad, y + boxH));
}

/** Blocco identificazione compatto (N., Data, Operatore). */
export function drawPdfIdentificationBlock(
  doc: jsPDF,
  startY: number,
  pageW: number,
  fields: PdfField[],
): number {
  if (!fields.length) return startY;
  let y = startY;
  doc.setFontSize(9.5);
  doc.setTextColor(...C_PRIMARY);
  for (const f of fields) {
    doc.setFont("helvetica", "bold");
    const prefix = `${f.label} `;
    doc.text(prefix, PDF_MARGIN_L, y);
    const pw = doc.getTextWidth(prefix);
    doc.setFont("helvetica", "normal");
    doc.text(f.value, PDF_MARGIN_L + pw, y);
    y += 5.2;
  }
  return y + 4;
}

export const pdfTableDefaults = {
  margin: { left: PDF_MARGIN_L, right: PDF_MARGIN_R },
  styles: {
    fontSize: 8.5,
    cellPadding: 2,
    textColor: C_PRIMARY,
    lineColor: C_RULE,
    lineWidth: 0.1,
  },
  headStyles: {
    fillColor: C_TABLE_HEAD,
    textColor: C_PRIMARY,
    fontStyle: "bold" as const,
    fontSize: 8,
  },
  theme: "plain" as const,
  tableLineWidth: 0.1,
  tableLineColor: C_RULE,
};

export const pdfPreventivoVoceTableColumns = {
  head: [["Voce", "Ore", "Costo orario", "Totale"]],
  columnStyles: {
    0: { cellWidth: "auto" as const },
    1: { cellWidth: 16, halign: "center" as const },
    2: { cellWidth: 28, halign: "right" as const },
    3: { cellWidth: 28, halign: "right" as const },
  },
};

export function getAutoTableFinalY(doc: jsPDF, fallbackY: number): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallbackY;
}

export function ensurePdfSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 32) {
    doc.addPage();
    return PDF_MARGIN_TOP;
  }
  return y;
}

/** Riepilogo economico finale (netto, IVA, totale con IVA). */
export function drawPdfTotalsSummary(
  doc: jsPDF,
  startY: number,
  pageW: number,
  lines: { label: string; value: string; primary?: boolean; muted?: boolean }[],
): number {
  let y = ensurePdfSpace(doc, startY + PDF_SECTION_GAP, 12 + lines.length * 6 + 10);
  y = drawPdfSectionTitle(doc, y, pageW, "Riepilogo importi");
  y += PDF_SECTION_CONTENT_GAP;

  const boxW = Math.min(96, pdfContentWidth(pageW));
  const boxX = pageW - PDF_MARGIN_R - boxW;
  const pad = 4.5;
  let boxH = pad * 2;
  for (const row of lines) {
    boxH += row.primary ? 7.8 : row.muted ? 5.6 : 6.4;
  }

  doc.setDrawColor(...C_RULE);
  doc.setFillColor(252, 252, 253);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, y, boxW, boxH, 1.5, 1.5, "FD");

  let innerY = y + pad + 4;
  for (const row of lines) {
    if (row.primary) {
      innerY += 1.6;
      doc.setDrawColor(...C_RULE);
      doc.setLineWidth(0.2);
      doc.line(boxX + pad, innerY - 2.4, boxX + boxW - pad, innerY - 2.4);
    }

    doc.setFont("helvetica", row.primary ? "bold" : "normal");
    doc.setFontSize(row.primary ? 11 : row.muted ? 8 : 9);
    doc.setTextColor(...(row.muted ? C_MUTED : C_PRIMARY));
    doc.text(row.label, boxX + pad, innerY);
    doc.text(row.value, boxX + boxW - pad, innerY, { align: "right" });
    innerY += row.primary ? 7.8 : row.muted ? 5.6 : 6.4;
  }

  return y + boxH + PDF_SECTION_GAP;
}

export function drawPdfPageFooters(doc: jsPDF, numero: string): void {
  const pageCount = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const numeroClean = cleanField(numero) ?? "";
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C_MUTED);
    const footer = numeroClean ? `${numeroClean} · Pag. ${i}/${pageCount}` : `Pag. ${i}/${pageCount}`;
    doc.text(footer, PDF_MARGIN_L, PDF_FOOTER_Y);
    doc.text(PDF_COMPANY_NAME, doc.internal.pageSize.getWidth() - PDF_MARGIN_R, PDF_FOOTER_Y, { align: "right" });
  }
}
