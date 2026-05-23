"use client";

import {
  PDF_MARGIN_L,
  PDF_MARGIN_R,
  PDF_PREVENTIVO_IVA_PERCENT,
  PDF_SECTION_CONTENT_GAP,
  PDF_SECTION_GAP,
  buildAnagraficaPdfFields,
  buildAttrezzaturaPdfFields,
  buildTelaioPdfFields,
  drawPdfFieldGrid,
  drawPdfPageFooters,
  drawPdfSectionTitle,
  drawPdfTotalsSummary,
  drawGestionalePdfHeader,
  ensurePdfSpace,
  fmtDateIt,
  fmtEuroPdf,
  getAutoTableFinalY,
  pdfAdvanceSection,
  pdfPreventivoVoceTableColumns,
  pdfTableDefaults,
} from "@/lib/pdf/core/pdf-base-template";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildPreventivoOutputRighe } from "@/lib/preventivi/preventivi-struttura";
import { totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";
import { buildPreventivoPdfDownloadFileName } from "@/lib/preventivi/preventivo-pdf-filename";
import {
  PREVENTIVO_SMALTIMENTO_DESCRIZIONE,
  PREVENTIVO_SMALTIMENTO_PERCENT,
} from "@/lib/preventivi/preventivi-voci-standard";
import { preventivoTipoDocumentoLabel } from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoRecord } from "@/lib/preventivi/types";

function buildManodoperaPdfRows(
  righe: ReturnType<typeof buildPreventivoOutputRighe>,
): string[][] {
  const body: string[][] = [];
  const manRow = righe.find((r) => r.sezione === "manodopera");
  const collRow = righe.find((r) => r.sezione === "collaudo");

  if (manRow && manRow.sezione === "manodopera") {
    body.push([
      "Manodopera",
      String(manRow.quantita),
      fmtEuroPdf(manRow.prezzoUnitario),
      fmtEuroPdf(manRow.totale),
    ]);
  }
  if (collRow && collRow.sezione === "collaudo") {
    body.push([
      collRow.descrizione,
      String(collRow.quantita),
      fmtEuroPdf(collRow.prezzoUnitario),
      fmtEuroPdf(collRow.totale),
    ]);
  }

  return body;
}

export function openPreventivoPdfInNewTab(p: PreventivoRecord, autore: string): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const righe = buildPreventivoOutputRighe(p);
  const tipoUpper = preventivoTipoDocumentoLabel(p.tipoDocumento).toUpperCase();
  const operatore = p.lastEditedBy?.trim() || autore.trim() || "Operatore";

  const totaleRicambi = p.totaleRicambi;
  const totaleManodopera = p.totaleManodopera;
  const totaleSmaltimento = p.totaleSmaltimento ?? 0;
  const totaleNetto = p.totaleFinale;
  const importoIva = Math.round(totaleNetto * (PDF_PREVENTIVO_IVA_PERCENT / 100) * 100) / 100;
  const totaleConIva = Math.round((totaleNetto + importoIva) * 100) / 100;

  let y = drawGestionalePdfHeader(doc, pageW, tipoUpper, {
    numero: p.numero.trim() || undefined,
    data: p.dataCreazione ? fmtDateIt(p.dataCreazione) : undefined,
    operatore,
  });
  y = pdfAdvanceSection(y);

  const anagrafica = buildAnagraficaPdfFields(p);
  if (anagrafica.length) {
    y = ensurePdfSpace(doc, y, 28);
    y = drawPdfSectionTitle(doc, y, pageW, "Dati anagrafici");
    y = drawPdfFieldGrid(doc, y, pageW, anagrafica);
    y = pdfAdvanceSection(y);
  }

  const attrezzatura = buildAttrezzaturaPdfFields(p);
  const telaio = buildTelaioPdfFields(p);
  if (attrezzatura.length) {
    y = ensurePdfSpace(doc, y, 28);
    y = drawPdfSectionTitle(doc, y, pageW, "Attrezzatura");
    y = drawPdfFieldGrid(doc, y, pageW, attrezzatura);
    y = pdfAdvanceSection(y);
  }
  if (telaio.length) {
    y = ensurePdfSpace(doc, y, 22);
    y = drawPdfSectionTitle(doc, y, pageW, "Telaio");
    y = drawPdfFieldGrid(doc, y, pageW, telaio);
    y = pdfAdvanceSection(y);
  }

  const manBody = buildManodoperaPdfRows(righe);
  y = ensurePdfSpace(doc, y, 26);
  y = drawPdfSectionTitle(doc, y, pageW, "Manodopera");
  y += PDF_SECTION_CONTENT_GAP;
  autoTable(doc, {
    startY: y,
    head: pdfPreventivoVoceTableColumns.head,
    body: manBody.length ? manBody : [["Nessuna manodopera indicata", "—", "—", "—"]],
    columnStyles: pdfPreventivoVoceTableColumns.columnStyles,
    ...pdfTableDefaults,
  });
  y = pdfAdvanceSection(getAutoTableFinalY(doc, y + 12));

  const ricBody = righe
    .filter((r) => r.sezione === "ricambi")
    .map((entry) => {
      const r = entry.riga;
      const net = totaleNettoRigaRicambio(r);
      return [
        r.codiceOE || "—",
        r.descrizione,
        String(r.quantita),
        fmtEuroPdf(r.prezzoUnitario),
        r.scontoPercent > 0
          ? `${r.scontoPercent.toLocaleString("it-IT", { maximumFractionDigits: 1 })} %`
          : "—",
        fmtEuroPdf(net),
      ];
    });

  y = ensurePdfSpace(doc, y, 26);
  y = drawPdfSectionTitle(doc, y, pageW, "Ricambi utilizzati");
  y += PDF_SECTION_CONTENT_GAP;
  autoTable(doc, {
    startY: y,
    head: [["Codice", "Descrizione", "Qtà", "Prezzo unit.", "Sconto", "Totale"]],
    body: ricBody.length ? ricBody : [["—", "Nessun ricambio", "—", "—", "—", "—"]],
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: "auto" as const },
      2: { cellWidth: 12, halign: "center" },
      3: { cellWidth: 24, halign: "right" },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 28, halign: "right" },
    },
    ...pdfTableDefaults,
  });
  y = pdfAdvanceSection(getAutoTableFinalY(doc, y + 12));

  const summaryLines: { label: string; value: string; primary?: boolean; muted?: boolean }[] = [
    { label: "Totale ricambi", value: fmtEuroPdf(totaleRicambi) },
    { label: "Totale manodopera", value: fmtEuroPdf(totaleManodopera) },
  ];
  if (totaleSmaltimento > 0) {
    summaryLines.push({
      label: `${PREVENTIVO_SMALTIMENTO_DESCRIZIONE} (${PREVENTIVO_SMALTIMENTO_PERCENT}%)`,
      value: fmtEuroPdf(totaleSmaltimento),
    });
  }
  summaryLines.push(
    { label: "TOTALE NETTO (senza IVA)", value: fmtEuroPdf(totaleNetto), primary: true },
    { label: `IVA (${PDF_PREVENTIVO_IVA_PERCENT}%)`, value: fmtEuroPdf(importoIva), muted: true },
    { label: "Totale con IVA", value: fmtEuroPdf(totaleConIva), muted: true },
  );

  y = drawPdfTotalsSummary(doc, y, pageW, summaryLines);

  if (p.noteFinali.trim()) {
    y = ensurePdfSpace(doc, y, 22);
    y = drawPdfSectionTitle(doc, y, pageW, "Note");
    y += PDF_SECTION_CONTENT_GAP;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(63, 63, 70);
    const noteLines = doc.splitTextToSize(p.noteFinali.trim(), pageW - PDF_MARGIN_L - PDF_MARGIN_R) as string[];
    doc.text(noteLines, PDF_MARGIN_L, y);
  }

  drawPdfPageFooters(doc, p.numero);

  const fileName = buildPreventivoPdfDownloadFileName(p);
  void openPdfBlobInNewTab(doc.output("blob"), fileName);
}
