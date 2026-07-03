import type { jsPDF } from "jspdf";
import { drawGestionaleFieldSectionTable, pdfFieldFromValue } from "@/lib/pdf/gestionale-section-table";
import {
  buildAttrezzaturaAnagraficaPdfFields,
  buildClienteAnagraficaPdfFields,
  buildIngressoAnagraficaPdfSectionsFromContext,
  buildTelaioAnagraficaPdfFields,
} from "@/lib/pdf/anagrafica-pdf-fields";
import {
  resolveInterventoDisplayForSurface,
  schedaIngressoFieldsFromDisplay,
} from "@/lib/domain/intervento-context/resolve-intervento-display-for-surface";
import type { PdfField } from "@/lib/pdf/core/pdf-base-template";
import { drawRichiedenteFirmaPdfBlock } from "@/lib/pdf/richiedente-firma-pdf";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore, SchedaIngressoDoc, SchedaIngressoFields } from "@/types/schede";

export type { SchedaIngressoFields };

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

/** Corpo PDF scheda ingresso — anagrafica da InterventoContext (row + store). */
export function drawIngressoPdfBody(
  doc: jsPDF,
  pageW: number,
  startY: number,
  scheda: SchedaIngressoDoc,
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
): number {
  const anagSections = buildIngressoAnagraficaPdfSectionsFromContext(row, schedeStore, scheda.campi);
  const display = resolveInterventoDisplayForSurface("pdf", {
    lavorazioneRow: row,
    schedeStore,
    ingressoCampi: scheda.campi,
  });
  const ctxFields = schedaIngressoFieldsFromDisplay(display, scheda.campi);
  const field = pdfFieldFromValue;
  const data = [
    field("Data ingresso", ctxFields.dataIngresso),
    field("Addetto accettazione", ctxFields.addettoAccettazione),
  ].filter((f): f is PdfField => f !== null);
  const altreInformazioni = [
    field("Descrizione anomalia", ctxFields.descrizioneAnomalia),
    field("Note intervento", ctxFields.noteIntervento),
  ].filter((f): f is PdfField => f !== null);

  let y = startY;

  y = drawGestionaleFieldSectionTable(doc, y, pageW, "Data", data);
  y = drawGestionaleFieldSectionTable(doc, y, pageW, "Cliente", anagSections.cliente);
  y = drawRichiedenteFirmaPdfBlock(doc, pageW, y, scheda.campi.richiedenteFirma ?? ctxFields.richiedenteFirma);
  const targetType =
    row.target_type ??
    scheda.campi.targetType ??
    (anagSections.attrezzatura.length ? "attrezzatura" : "telaio");
  if (targetType === "attrezzatura" && anagSections.attrezzatura.length > 0) {
    y = drawGestionaleFieldSectionTable(doc, y, pageW, "Attrezzatura", anagSections.attrezzatura);
  }
  if (targetType === "telaio" && anagSections.telaio.length > 0) {
    y = drawGestionaleFieldSectionTable(doc, y, pageW, "Telaio", anagSections.telaio);
  }
  if (targetType !== "telaio" && targetType !== "attrezzatura") {
    y = drawGestionaleFieldSectionTable(doc, y, pageW, "Attrezzatura", anagSections.attrezzatura);
    y = drawGestionaleFieldSectionTable(doc, y, pageW, "Telaio", anagSections.telaio);
  }
  y = drawGestionaleFieldSectionTable(doc, y, pageW, "Altre informazioni", altreInformazioni, {
    multiline: true,
  });

  return y;
}
