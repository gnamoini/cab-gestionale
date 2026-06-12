import { jsPDF } from "jspdf";
import {
  drawGestionalePdfHeader,
  drawPdfPageFooters,
  fmtDateIt,
  pdfAdvanceSection,
} from "@/lib/pdf/core/pdf-base-template";
import { assertInterventoExportAlignment } from "@/lib/domain/intervento-context/intervento-export-alignment";
import { resolveInterventoDisplayForSurface, schedaIngressoFieldsFromDisplay } from "@/lib/domain/intervento-context/resolve-intervento-display-for-surface";
import { drawIngressoPdfBody } from "@/lib/pdf/ingresso-pdf-layout";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoRow } from "@/src/types/supabase-tables";
import { drawLavorazioniPdfBody, drawRicambiPdfBody } from "@/lib/pdf/schede-pdf-layout";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import { buildSchedaPdfDownloadFileName } from "@/lib/schede/scheda-pdf-filename";
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

export function generateSchedaPdfBytes(opts: {
  titoloScheda: string;
  identificazioneLine: string;
  bundle: LavorazioneSchedeBundle;
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc;
  autore: string;
  logoDataUrl: string | null;
  lavorazioneRow?: LavorazioneListRow | null;
  mezzoRow?: MezzoRow | null;
}): Uint8Array {
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
    logoDataUrl: opts.logoDataUrl,
  });
  y = pdfAdvanceSection(y);

  if (opts.doc.tipo === "ingresso") {
    if (!opts.lavorazioneRow) {
      throw new Error("PDF ingresso richiede lavorazioneRow per derivare anagrafica da InterventoContext.");
    }
    const schedeStoreSlice = { [opts.bundle.lavorazioneId]: opts.bundle };
    const display = resolveInterventoDisplayForSurface("pdf", {
      lavorazioneRow: opts.lavorazioneRow,
      schedeStore: schedeStoreSlice,
      ingressoCampi: opts.doc.campi,
    });
    const exportFields = schedaIngressoFieldsFromDisplay(display, opts.doc.campi);
    assertInterventoExportAlignment(opts.lavorazioneRow, schedeStoreSlice, { pdfFields: exportFields });
    drawIngressoPdfBody(doc, pageW, y, opts.doc, opts.lavorazioneRow, schedeStoreSlice);
  } else if (opts.doc.tipo === "lavorazioni") {
    drawLavorazioniPdfBody(doc, pageW, y, opts.doc, opts.bundle, ident);
  } else {
    drawRicambiPdfBody(doc, pageW, y, opts.doc, opts.bundle, ident);
  }

  drawPdfPageFooters(doc, footerRef);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function schedaPdfFileName(opts: {
  doc: SchedaIngressoDoc | SchedaLavorazioniDoc | SchedaRicambiDoc;
  bundle: LavorazioneSchedeBundle;
  titoloScheda: string;
}): string {
  return buildSchedaPdfDownloadFileName({
    doc: opts.doc,
    lavorazioneId: opts.bundle.lavorazioneId,
    codiceLavorazione: opts.bundle.codice,
    titoloScheda: opts.titoloScheda,
  });
}
