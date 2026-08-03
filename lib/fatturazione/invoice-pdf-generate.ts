import { jsPDF } from "jspdf";
import {
  drawGestionalePdfHeader,
  drawPdfPageFooters,
  fmtDateIt,
  pdfAdvanceAfterDocumentHeader,
} from "@/lib/pdf/core/pdf-base-template";
import type { InvoiceDetail } from "@/lib/fatturazione/types";
import { invoiceDisplayNumber } from "@/lib/fatturazione/fatturazione-list-ui-filters";

export function generateInvoicePdfBytes(detail: InvoiceDetail, logoDataUrl: string | null): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const inv = detail.invoice;
  const num = invoiceDisplayNumber(inv);

  let y = drawGestionalePdfHeader(doc, pageW, "FATTURA", {
    numero: num,
    data: fmtDateIt(inv.data_emissione),
    logoDataUrl,
  });
  y = pdfAdvanceAfterDocumentHeader(y);

  doc.setFontSize(10);
  doc.text(`Cliente: ${inv.cliente_label}`, 14, y);
  y += 6;
  if (inv.data_scadenza) {
    doc.text(`Scadenza: ${fmtDateIt(inv.data_scadenza)}`, 14, y);
    y += 8;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Descrizione", 14, y);
  doc.text("Totale", pageW - 14, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 5;

  for (const row of detail.rows) {
    if (y > 270) {
      doc.addPage();
      y = 16;
    }
    doc.text(row.descrizione.slice(0, 80), 14, y);
    doc.text(row.totale.toFixed(2), pageW - 14, y, { align: "right" });
    y += 5;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(`Imponibile: ${inv.imponibile.toFixed(2)} €`, 14, y);
  y += 5;
  doc.text(`IVA: ${inv.iva.toFixed(2)} €`, 14, y);
  y += 5;
  doc.text(`Totale: ${inv.totale.toFixed(2)} €`, 14, y);
  y += 5;
  doc.text(`Pagato: ${inv.pagato.toFixed(2)} € — Residuo: ${inv.residuo.toFixed(2)} €`, 14, y);

  drawPdfPageFooters(doc, num);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function invoicePdfFileName(detail: InvoiceDetail): string {
  const safe = detail.invoice.cliente_label.replace(/[^\w\-]+/g, "_").slice(0, 40);
  return `Fattura_${invoiceDisplayNumber(detail.invoice)}_${safe}.pdf`;
}
