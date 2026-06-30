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
import {
  buildClienteAnagraficaPdfFields,
  buildClienteFiscalePdfFields,
  type PreventivoClientePdfOptions,
} from "@/lib/pdf/anagrafica-pdf-fields";
import { ddtDisplayNumber } from "@/lib/ddt/ddt-list-ui-filters";
import type { DdtDetail } from "@/lib/ddt/types";

function formatAddress(snapshot: Record<string, unknown> | undefined): string {
  if (!snapshot) return "";
  const parts = [
    snapshot.indirizzo,
    [snapshot.cap, snapshot.citta, snapshot.provincia].filter(Boolean).join(" "),
  ].filter(Boolean);
  return parts.map(String).join(" — ");
}

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
  y = pdfAdvanceAfterDocumentHeader(y);

  const cust = d.customer_snapshot as Record<string, unknown>;
  const operativi = buildClienteAnagraficaPdfFields({
    cliente: d.cliente_label,
    cantiere: typeof cust.cantiere === "string" ? cust.cantiere : undefined,
    utilizzatore: typeof cust.utilizzatore === "string" ? cust.utilizzatore : undefined,
  });
  const anag = clientePdf?.clienteAnagrafica;
  const fiscali =
    anag?.id
      ? buildClienteFiscalePdfFields(anag, { codiceFiscale: clientePdf?.codiceFiscale })
      : [];
  const clienteFields = [...fiscali, ...operativi.filter((o) => !fiscali.some((f) => f.label === o.label && f.value === o.value))];
  if (clienteFields.length > 0) {
    y = drawGestionaleFieldSectionTable(doc, y, pageW, "Cliente", clienteFields);
  } else {
    doc.setFontSize(10);
    doc.text(`Cliente: ${d.cliente_label}`, 14, y);
    y += 5;
  }

  const consegna = formatAddress(d.luogo_consegna as Record<string, unknown>);
  if (consegna) {
    doc.text(`Luogo consegna: ${consegna}`, 14, y);
    y += 5;
  }
  if (d.causale_trasporto) {
    doc.text(`Causale: ${d.causale_trasporto}`, 14, y);
    y += 5;
  }
  if (d.vettore) {
    doc.text(`Vettore: ${d.vettore}`, 14, y);
    y += 5;
  }

  const mezzo = d.mezzo_snapshot as Record<string, unknown>;
  const mezzoParts = [
    mezzo.targa ? `Targa ${mezzo.targa}` : null,
    mezzo.matricola ? `Matricola ${mezzo.matricola}` : null,
    mezzo.telaio ? `Telaio ${mezzo.telaio}` : null,
    mezzo.attrezzatura ? String(mezzo.attrezzatura) : null,
  ].filter(Boolean);
  if (mezzoParts.length) {
    doc.text(`Mezzo: ${mezzoParts.join(" · ")}`, 14, y);
    y += 5;
  }

  if (cust.preventivo_numero) {
    doc.text(`Rif. preventivo: ${String(cust.preventivo_numero)}`, 14, y);
    y += 5;
  }
  if (d.data_consegna) {
    doc.text(`Data consegna prevista: ${fmtDateIt(d.data_consegna)}`, 14, y);
    y += 5;
  }

  const body = detail.rows.map((row) => [
    (row.codice ?? "—").slice(0, 16),
    row.descrizione,
    String(row.quantita),
    row.unita_misura || "pz",
  ]);

  y = drawGestionaleDataSectionTable(
    doc,
    y + 2,
    pageW,
    "Righe merce",
    ["Codice", "Descrizione", "Q.tà", "U.M."],
    body,
    ddtRowsColumnStyles(contentW),
  );

  if (d.note?.trim()) {
    doc.setFontSize(9);
    doc.text(`Note: ${d.note.trim().slice(0, 200)}`, 14, y);
    y += 8;
  }

  y = Math.min(y + 12, 260);
  doc.line(14, y, 90, y);
  doc.line(pageW - 90, y, pageW - 14, y);
  y += 4;
  doc.setFontSize(9);
  doc.text("Firma destinatario", 14, y);
  doc.text("Firma trasportatore", pageW - 90, y);

  drawPdfPageFooters(doc, num);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function ddtPdfFileName(detail: DdtDetail): string {
  const safe = detail.document.cliente_label.replace(/[^\w\-]+/g, "_").slice(0, 40);
  return `DDT_${ddtDisplayNumber(detail.document).replace("/", "-")}_${safe}.pdf`;
}
