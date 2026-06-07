"use client";

import {
  drawGestionalePdfHeader,
  drawPdfPageFooters,
  fmtDateIt,
  pdfAdvanceSection,
} from "@/lib/pdf/core/pdf-base-template";
import { drawIngressoPdfBody } from "@/lib/pdf/ingresso-pdf-layout";
import { drawLavorazioniPdfBody, drawRicambiPdfBody } from "@/lib/pdf/schede-pdf-layout";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import { openPdfBlobInNewTab } from "@/lib/pdf/open-pdf-blob-preview";
import { buildSchedaPdfDownloadFileName } from "@/lib/schede/scheda-pdf-filename";
import { jsPDF } from "jspdf";
import { loadBrandingLogoDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import type { LavorazioneSchedeBundle, SchedaIngressoDoc, SchedaLavorazioniDoc, SchedaRicambiDoc } from "@/types/schede";

function schedaDocumentTitle(titoloScheda: string): string {
  const t = titoloScheda.trim();
  if (!t) return "SCHEDA";
  return t.toUpperCase();
}

function schedaPdfDisplayNumero(bundle: LavorazioneSchedeBundle): string | undefined {
  const n = lavorazioneDisplayCodice({ codice: bundle.codice, id: bundle.lavorazioneId }).trim();
  return n || undefined;
}

/** Apre un PDF reale (blob) in nuova scheda con layout unificato preventivi/schede. */
export async function openSchedaPdfInNewTab(opts: {
  titoloScheda: string;
  identificazioneLine: string;
  bundle: LavorazioneSchedeBundle;
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc;
  autore: string;
}): Promise<void> {
  const logoDataUrl = await loadBrandingLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const ident = opts.identificazioneLine.trim();
  const operatore = opts.autore.trim() || opts.doc.updatedBy?.trim() || opts.doc.createdBy?.trim() || "Operatore";
  const docDate = opts.doc.createdAt ? fmtDateIt(opts.doc.createdAt) : fmtDateIt(new Date().toISOString());
  const displayNumero = schedaPdfDisplayNumero(opts.bundle);
  const footerRef = displayNumero || opts.titoloScheda.trim() || "Scheda";

  let y = drawGestionalePdfHeader(doc, pageW, schedaDocumentTitle(opts.titoloScheda), {
    numero: displayNumero,
    data: docDate,
    operatore,
    logoDataUrl,
  });
  y = pdfAdvanceSection(y);

  if (opts.doc.tipo === "ingresso") {
    drawIngressoPdfBody(doc, pageW, y, opts.doc);
  } else if (opts.doc.tipo === "lavorazioni") {
    drawLavorazioniPdfBody(doc, pageW, y, opts.doc, opts.bundle, ident);
  } else {
    drawRicambiPdfBody(doc, pageW, y, opts.doc, opts.bundle, ident);
  }

  drawPdfPageFooters(doc, footerRef);

  const fileName = buildSchedaPdfDownloadFileName({
    doc: opts.doc,
    lavorazioneId: opts.bundle.lavorazioneId,
    codiceLavorazione: opts.bundle.codice,
    titoloScheda: opts.titoloScheda,
  });
  void openPdfBlobInNewTab(doc.output("blob"), fileName);
}
