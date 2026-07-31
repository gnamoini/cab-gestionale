import { jsPDF } from "jspdf";
import {
  drawGestionalePdfHeader,
  drawPdfPageFooters,
  fmtDateIt,
  pdfAdvanceAfterDocumentHeader,
  drawGestionaleDataSectionTable,
  PDF_MARGIN_L,
  PDF_MARGIN_R,
  pdfContentWidth,
} from "@/lib/pdf/core/pdf-base-template";
import {
  drawGestionaleCompactFieldSectionTable,
  drawGestionaleFieldSectionTable,
  drawGestionaleTripleFieldSectionTable,
  pdfFieldFromValue,
} from "@/lib/pdf/gestionale-section-table";
import {
  buildDdtDestinatarioPdfFields,
  buildDdtOggettoInterventoPdfFields,
  buildDdtTrasportoPdfFields,
} from "@/lib/pdf/ddt-pdf-fields";
import type { PreventivoClientePdfOptions } from "@/lib/pdf/anagrafica-pdf-fields";
import { ddtDisplayNumber } from "@/lib/ddt/ddt-list-ui-filters";
import type { DdtDetail } from "@/lib/ddt/types";

function ddtRowsColumnStyles(contentW: number) {
  const base = [28, 92, 22, 18] as const;
  const sum = base.reduce((acc, w) => acc + w, 0);
  const scale = contentW / sum;
  return {
    0: { cellWidth: base[0] * scale, halign: "left" as const, fontSize: 8.5 },
    1: { cellWidth: base[1] * scale, halign: "left" as const },
    2: { cellWidth: base[2] * scale, halign: "right" as const },
    3: { cellWidth: base[3] * scale, halign: "left" as const },
  };
}

function drawDdtFirmeSection(doc: jsPDF, startY: number, pageW: number): number {
  let y = Math.min(startY + 10, 248);
  const lineW = 76;
  doc.setDrawColor(24, 24, 27);
  doc.setLineWidth(0.2);
  doc.line(PDF_MARGIN_L, y, PDF_MARGIN_L + lineW, y);
  doc.line(pageW - PDF_MARGIN_R - lineW, y, pageW - PDF_MARGIN_R, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(82, 82, 91);
  doc.text("Firma destinatario", PDF_MARGIN_L, y);
  doc.text("Firma trasportatore", pageW - PDF_MARGIN_R - lineW, y);
  return y + 6;
}

export function generateDdtPdfBytes(
  detail: DdtDetail,
  logoDataUrl: string | null,
  clientePdf?: PreventivoClientePdfOptions,
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pdfContentWidth(pageW);
  const d = detail.document;
  const num = ddtDisplayNumber(d);

  let y = drawGestionalePdfHeader(doc, pageW, "DOCUMENTO DI TRASPORTO", {
    numero: num,
    data: fmtDateIt(d.data_documento),
    logoDataUrl,
  });
  y = pdfAdvanceAfterDocumentHeader(y, 0.5);

  const destinatario = buildDdtDestinatarioPdfFields(d, clientePdf);
  if (destinatario.length > 0) {
    y = drawGestionaleCompactFieldSectionTable(doc, y, pageW, "Destinatario", destinatario);
  }

  const oggetto = buildDdtOggettoInterventoPdfFields(d);
  if (oggetto.length > 0) {
    y = drawGestionaleTripleFieldSectionTable(doc, y, pageW, "Oggetto intervento", oggetto);
  }

  const trasporto = buildDdtTrasportoPdfFields(d);
  if (trasporto.length > 0) {
    y = drawGestionaleCompactFieldSectionTable(doc, y, pageW, "Dati trasporto", trasporto);
  }

  const body = detail.rows.map((row) => [
    (row.codice ?? "—").slice(0, 16),
    row.descrizione,
    String(row.quantita),
    row.unita_misura || "pz",
  ]);

  y = drawGestionaleDataSectionTable(
    doc,
    y,
    pageW,
    "Righe merce",
    ["Codice", "Descrizione", "Q.tà", "U.M."],
    body.length ? body : [["—", "Nessuna riga", "—", "—"]],
    ddtRowsColumnStyles(contentW),
  );

  const noteField = pdfFieldFromValue("Note", d.note?.trim());
  if (noteField) {
    y = drawGestionaleFieldSectionTable(doc, y, pageW, "Note", [noteField], { multiline: true });
  }

  drawDdtFirmeSection(doc, y, pageW);
  drawPdfPageFooters(doc, num);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function ddtPdfFileName(detail: DdtDetail): string {
  const safe = detail.document.cliente_label.replace(/[^\w\-]+/g, "_").slice(0, 40);
  return `DDT_${ddtDisplayNumber(detail.document).replace("/", "-")}_${safe}.pdf`;
}
