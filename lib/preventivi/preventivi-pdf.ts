"use client";

import {
  PDF_PREVENTIVO_IVA_PERCENT,
  drawPdfPageFooters,
  drawGestionalePdfHeader,
  fmtDateIt,
  pdfAdvanceSection,
} from "@/lib/pdf/core/pdf-base-template";
import { drawPreventivoPdfBody } from "@/lib/pdf/preventivo-pdf-body";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import { jsPDF } from "jspdf";
import { buildPreventivoOutputRighe } from "@/lib/preventivi/preventivi-struttura";
import { buildPreventivoPdfDownloadFileName } from "@/lib/preventivi/preventivo-pdf-filename";
import { preventivoTipoDocumentoLabel } from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export function openPreventivoPdfInNewTab(p: PreventivoRecord, autore: string): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const righe = buildPreventivoOutputRighe(p);
  const tipoUpper = preventivoTipoDocumentoLabel(p.tipoDocumento).toUpperCase();
  const operatore = p.lastEditedBy?.trim() || autore.trim() || "Operatore";

  const totaleNetto = p.totaleFinale;
  const importoIva = Math.round(totaleNetto * (PDF_PREVENTIVO_IVA_PERCENT / 100) * 100) / 100;
  const totaleConIva = Math.round((totaleNetto + importoIva) * 100) / 100;

  let y = drawGestionalePdfHeader(doc, pageW, tipoUpper, {
    numero: p.numero.trim() || undefined,
    data: p.dataCreazione ? fmtDateIt(p.dataCreazione) : undefined,
    operatore,
  });
  y = pdfAdvanceSection(y);

  y = drawPreventivoPdfBody(doc, pageW, y, p, righe, {
    totaleRicambi: p.totaleRicambi,
    totaleManodopera: p.totaleManodopera,
    totaleSmaltimento: p.totaleSmaltimento ?? 0,
    totaleNetto,
    importoIva,
    totaleConIva,
    ivaPercent: PDF_PREVENTIVO_IVA_PERCENT,
  });

  drawPdfPageFooters(doc, p.numero);

  const fileName = buildPreventivoPdfDownloadFileName(p);
  void openPdfBlobInNewTab(doc.output("blob"), fileName);
}
