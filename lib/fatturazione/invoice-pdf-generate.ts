import { jsPDF } from "jspdf";
import {
  drawGestionalePdfHeader,
  drawPdfPageFooters,
  fmtDateIt,
  pdfAdvanceAfterDocumentHeader,
} from "@/lib/pdf/core/pdf-base-template";
import type { InvoiceDetail } from "@/lib/fatturazione/types";
import { invoiceDisplayNumber } from "@/lib/fatturazione/fatturazione-list-ui-filters";

function snapshotTitle(detail: InvoiceDetail): string {
  const dt = detail.invoice.document_type;
  if (dt === "nota_credito") return "NOTA DI CREDITO";
  if (dt === "nota_debito") return "NOTA DI DEBITO";
  return "FATTURA";
}

export function generateInvoicePdfBytes(detail: InvoiceDetail, logoDataUrl: string | null): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const inv = detail.invoice;
  const snap = (inv.invoice_snapshot ?? {}) as {
    cliente?: Record<string, unknown>;
    documento?: Record<string, unknown>;
    righe?: Array<Record<string, unknown>>;
    totali?: { imponibile?: number; iva?: number; totale?: number };
  };
  const emitted = Boolean(snap.documento?.numero ?? inv.numero);
  const num = invoiceDisplayNumber(inv);
  const cliente = String(snap.cliente?.ragione_sociale ?? snap.cliente?.cliente_label ?? inv.cliente_label);
  const righe =
    Array.isArray(snap.righe) && snap.righe.length > 0
      ? snap.righe
      : detail.rows.map((r) => ({ descrizione: r.descrizione, totale: r.totale }));
  const totale = Number(snap.totali?.totale ?? inv.totale);
  const imponibile = Number(snap.totali?.imponibile ?? inv.imponibile);
  const iva = Number(snap.totali?.iva ?? inv.iva);

  let y = drawGestionalePdfHeader(doc, pageW, snapshotTitle(detail), {
    numero: num,
    data: fmtDateIt(String(snap.documento?.data_emissione ?? inv.data_emissione)),
    logoDataUrl,
  });
  y = pdfAdvanceAfterDocumentHeader(y);

  if (!emitted) {
    doc.setFontSize(18);
    doc.setTextColor(180, 40, 40);
    doc.text("BOZZA — non fiscale", pageW / 2, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 10;
  }

  doc.setFontSize(10);
  doc.text(`Cliente: ${cliente}`, 14, y);
  y += 6;
  const scadenza = String(snap.documento?.data_scadenza ?? inv.data_scadenza ?? "");
  if (scadenza) {
    doc.text(`Scadenza: ${fmtDateIt(scadenza)}`, 14, y);
    y += 8;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Descrizione", 14, y);
  doc.text("Totale", pageW - 14, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 5;

  for (const row of righe) {
    if (y > 270) {
      doc.addPage();
      y = 16;
    }
    const desc = String(row.descrizione ?? "").slice(0, 80);
    const rowTot = Number(row.totale ?? 0);
    doc.text(desc, 14, y);
    doc.text(rowTot.toFixed(2), pageW - 14, y, { align: "right" });
    y += 5;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(`Imponibile: ${imponibile.toFixed(2)} €`, 14, y);
  y += 5;
  doc.text(`IVA: ${iva.toFixed(2)} €`, 14, y);
  y += 5;
  doc.text(`Totale: ${totale.toFixed(2)} €`, 14, y);
  y += 5;
  doc.text(`Pagato: ${inv.pagato.toFixed(2)} € — Residuo: ${inv.residuo.toFixed(2)} €`, 14, y);

  drawPdfPageFooters(doc, num);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function invoicePdfFileName(detail: InvoiceDetail): string {
  const prefix =
    detail.invoice.document_type === "nota_credito"
      ? "NotaCredito"
      : detail.invoice.document_type === "nota_debito"
        ? "NotaDebito"
        : "Fattura";
  const safe = detail.invoice.cliente_label.replace(/[^\w\-]+/g, "_").slice(0, 40);
  return `${prefix}_${invoiceDisplayNumber(detail.invoice)}_${safe}.pdf`;
}
