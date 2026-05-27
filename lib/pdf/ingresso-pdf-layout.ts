import type { jsPDF } from "jspdf";
import { drawGestionaleFieldSectionTable, pdfFieldFromValue } from "@/lib/pdf/gestionale-section-table";
import {
  buildAttrezzaturaAnagraficaPdfFields,
  buildClienteAnagraficaPdfFields,
  buildTelaioAnagraficaPdfFields,
} from "@/lib/pdf/anagrafica-pdf-fields";
import type { PdfField } from "@/lib/pdf/core/pdf-base-template";
import type { SchedaIngressoDoc, SchedaIngressoFields } from "@/types/schede";

export function buildIngressoPdfSections(c: SchedaIngressoFields): {
  data: PdfField[];
  cliente: PdfField[];
  attrezzatura: PdfField[];
  telaio: PdfField[];
  altreInformazioni: PdfField[];
} {
  const field = pdfFieldFromValue;
  return {
    data: [
      field("Data ingresso", c.dataIngresso),
      field("Addetto accettazione", c.addettoAccettazione),
    ].filter(
      (f): f is PdfField => f !== null,
    ),
    cliente: buildClienteAnagraficaPdfFields(c),
    attrezzatura: buildAttrezzaturaAnagraficaPdfFields(c),
    telaio: buildTelaioAnagraficaPdfFields(c),
    altreInformazioni: [
      field("Descrizione anomalia", c.descrizioneAnomalia),
      field("Note intervento", c.noteIntervento),
    ].filter((f): f is PdfField => f !== null),
  };
}

/** Corpo PDF scheda ingresso — layout table-based (header/footer gestiti dal chiamante). */
export function drawIngressoPdfBody(
  doc: jsPDF,
  pageW: number,
  startY: number,
  scheda: SchedaIngressoDoc,
): number {
  const sections = buildIngressoPdfSections(scheda.campi);
  let y = startY;

  y = drawGestionaleFieldSectionTable(doc, y, pageW, "Data", sections.data);
  y = drawGestionaleFieldSectionTable(doc, y, pageW, "Cliente", sections.cliente);
  y = drawGestionaleFieldSectionTable(doc, y, pageW, "Attrezzatura", sections.attrezzatura);
  y = drawGestionaleFieldSectionTable(doc, y, pageW, "Telaio", sections.telaio);
  y = drawGestionaleFieldSectionTable(doc, y, pageW, "Altre informazioni", sections.altreInformazioni, {
    multiline: true,
  });

  return y;
}
