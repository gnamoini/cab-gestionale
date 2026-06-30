import { jsPDF } from "jspdf";
import {
  PDF_PREVENTIVO_IVA_PERCENT,
  drawPdfPageFooters,
  drawGestionalePdfHeader,
  fmtDateIt,
  pdfAdvanceAfterDocumentHeader,
} from "@/lib/pdf/core/pdf-base-template";
import { drawPreventivoPdfBody } from "@/lib/pdf/preventivo-pdf-body";
import type { PreventivoClientePdfOptions } from "@/lib/pdf/anagrafica-pdf-fields";
import { buildPreventivoOutputRighe } from "@/lib/preventivi/preventivi-struttura";
import { buildPreventivoPdfDownloadFileName } from "@/lib/preventivi/preventivo-pdf-filename";
import { preventivoTipoDocumentoLabel } from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoRecord } from "@/lib/preventivi/types";

export function generatePreventivoPdfBytes(
  p: PreventivoRecord,
  autore: string,
  logoDataUrl: string | null,
  clientePdf?: PreventivoClientePdfOptions,
): Uint8Array {
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
    logoDataUrl,
  });
  y = pdfAdvanceAfterDocumentHeader(y);

  y = drawPreventivoPdfBody(doc, pageW, y, p, righe, {
    totaleRicambi: p.totaleRicambi,
    totaleManodopera: p.totaleManodopera,
    totaleSmaltimento: p.totaleSmaltimento ?? 0,
    totaleNetto,
    importoIva,
    totaleConIva,
    ivaPercent: PDF_PREVENTIVO_IVA_PERCENT,
  }, clientePdf);

  drawPdfPageFooters(doc, p.numero);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function preventivoPdfFileName(p: PreventivoRecord): string {
  return buildPreventivoPdfDownloadFileName(p);
}
