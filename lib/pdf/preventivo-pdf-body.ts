import type { jsPDF } from "jspdf";
import {
  drawGestionaleCompactFieldSectionTable,
  drawGestionaleDataSectionTable,
  drawGestionaleFieldSectionTable,
  compactOggettoInterventoColumnStyles,
  pdfFieldFromValue,
} from "@/lib/pdf/gestionale-section-table";
import {
  buildPreventivoDestinatarioPdfFields,
  buildPreventivoOggettoInterventoPdfFields,
} from "@/lib/pdf/anagrafica-pdf-fields";
import {
  fmtEuroPdf,
  pdfPreventivoVoceTableColumns,
  type PdfField,
} from "@/lib/pdf/core/pdf-base-template";
import {
  parsePreventivoLavorazioniClientePdfLines,
  type PreventivoRigaOutput,
} from "@/lib/preventivi/preventivi-struttura";
import { totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";
import { tipoRigaRicambio } from "@/lib/preventivi/preventivi-struttura";
import {
  formatRicambioUnitaMisuraShort,
  parseRicambioUnitaMisura,
} from "@/lib/magazzino/ricambio-unita-misura";
import {
  PREVENTIVO_SMALTIMENTO_DESCRIZIONE,
  PREVENTIVO_SMALTIMENTO_PERCENT,
  isDescrizioneMaterialiConsumo,
} from "@/lib/preventivi/preventivi-voci-standard";
import type { PreventivoClientePdfOptions } from "@/lib/pdf/anagrafica-pdf-fields";
import type { PreventivoRecord, PreventivoTipoDocumento } from "@/lib/preventivi/types";

export function preventivoPdfLavorazioniSectionTitle(tipo: PreventivoTipoDocumento): string {
  return tipo === "consuntivo" ? "Lavorazioni da effettuare" : "Lavorazioni effettuate";
}

export function preventivoPdfMaterialiSectionTitle(tipo: PreventivoTipoDocumento): string {
  return tipo === "consuntivo" ? "Materiali da usare" : "MATERIALI UTILIZZATI";
}

export type PreventivoPdfEconomics = {
  totaleRicambi: number;
  totaleManodopera: number;
  totaleSmaltimento: number;
  totaleNetto: number;
  importoIva: number;
  totaleConIva: number;
  ivaPercent: number;
};

const RICAMBI_HEAD = ["Codice", "Descrizione", "Qtà", "Prezzo unit.", "Sconto", "Totale"] as const;

const RICAMBI_COLUMN_STYLES = {
  0: { cellWidth: 22 },
  1: { cellWidth: "auto" as const },
  2: { cellWidth: 17, halign: "center" as const },
  3: { cellWidth: 24, halign: "right" as const },
  4: { cellWidth: 16, halign: "center" as const },
  5: { cellWidth: 28, halign: "right" as const },
};

function formatPdfRicambioQuantita(quantita: number, unitaMisura: unknown): string {
  const unita = parseRicambioUnitaMisura(unitaMisura);
  const q = Number.isInteger(quantita)
    ? String(quantita)
    : quantita.toLocaleString("it-IT", { maximumFractionDigits: 2 });
  return `${q} ${formatRicambioUnitaMisuraShort(unita)}`;
}

const LAVORAZIONI_COLUMN_STYLES = {
  0: { cellWidth: "auto" as const },
};

export function buildLavorazioniEffettuatePdfRows(p: PreventivoRecord): string[][] {
  return parsePreventivoLavorazioniClientePdfLines(
    p.descrizioneLavorazioniCliente,
    p.sanificazioneDescrizione,
  ).map((line) => [line]);
}

export function computeManodoperaSectionTotal(righe: readonly PreventivoRigaOutput[]): number {
  let total = 0;
  for (const r of righe) {
    if (r.sezione === "sanificazione" || r.sezione === "manodopera" || r.sezione === "collaudo") {
      total += r.totale;
    }
  }
  return Math.round(total * 100) / 100;
}

function pushOrePrezzoPdfRow(body: string[][], descrizione: string, quantita: number, prezzoUnitario: number, totale: number) {
  body.push([
    descrizione,
    quantita > 0 ? String(quantita) : "—",
    fmtEuroPdf(prezzoUnitario),
    fmtEuroPdf(totale),
  ]);
}

export function buildManodoperaPdfRows(righe: readonly PreventivoRigaOutput[]): string[][] {
  const body: string[][] = [];
  const sanRow = righe.find((r) => r.sezione === "sanificazione");
  const manRow = righe.find((r) => r.sezione === "manodopera");
  const collRow = righe.find((r) => r.sezione === "collaudo");

  if (sanRow && sanRow.sezione === "sanificazione") {
    pushOrePrezzoPdfRow(body, sanRow.descrizione, sanRow.quantita, sanRow.prezzoUnitario, sanRow.totale);
  }
  if (manRow && manRow.sezione === "manodopera") {
    pushOrePrezzoPdfRow(body, "Manodopera", manRow.quantita, manRow.prezzoUnitario, manRow.totale);
  }
  if (collRow && collRow.sezione === "collaudo") {
    pushOrePrezzoPdfRow(body, collRow.descrizione, collRow.quantita, collRow.prezzoUnitario, collRow.totale);
  }

  return body;
}

export function buildRicambiPdfRows(righe: readonly PreventivoRigaOutput[]): string[][] {
  return righe
    .filter((r) => r.sezione === "ricambi")
    .map((entry) => {
      const r = entry.riga;
      const net = totaleNettoRigaRicambio(r);
      const codiceVuoto =
        tipoRigaRicambio(r) === "materiali_consumo" || isDescrizioneMaterialiConsumo(r.descrizione);
      return [
        codiceVuoto ? "" : r.codiceOE || "—",
        r.descrizione,
        formatPdfRicambioQuantita(r.quantita, r.unitaMisura),
        fmtEuroPdf(r.prezzoUnitario),
        r.scontoPercent > 0
          ? `${r.scontoPercent.toLocaleString("it-IT", { maximumFractionDigits: 1 })} %`
          : "—",
        fmtEuroPdf(net),
      ];
    });
}

/** Campi riepilogo economico (netto, IVA, totale documento). */
export function buildPreventivoPdfRiepilogoFields(economics: PreventivoPdfEconomics): PdfField[] {
  const fields: PdfField[] = [];

  if (economics.totaleSmaltimento > 0) {
    fields.push({
      label: `${PREVENTIVO_SMALTIMENTO_DESCRIZIONE} (${PREVENTIVO_SMALTIMENTO_PERCENT}%)`,
      value: fmtEuroPdf(economics.totaleSmaltimento),
    });
  }

  fields.push({
    label: "TOTALE NETTO (senza IVA)",
    value: fmtEuroPdf(economics.totaleNetto),
    bold: true,
  });
  fields.push({
    label: `TOTALE IVA (${economics.ivaPercent}%)`,
    value: fmtEuroPdf(economics.importoIva),
  });
  fields.push({
    label: "TOTALE DOCUMENTO",
    value: fmtEuroPdf(economics.totaleConIva),
    bold: true,
  });
  return fields;
}

/** Campi netto/smaltimento (senza duplicare subtotali sezione). */
export function buildPreventivoPdfNettoFields(economics: PreventivoPdfEconomics): PdfField[] {
  const fields: PdfField[] = [];

  if (economics.totaleSmaltimento > 0) {
    fields.push({
      label: `${PREVENTIVO_SMALTIMENTO_DESCRIZIONE} (${PREVENTIVO_SMALTIMENTO_PERCENT}%)`,
      value: fmtEuroPdf(economics.totaleSmaltimento),
    });
  }

  fields.push({
    label: "TOTALE NETTO (senza IVA)",
    value: fmtEuroPdf(economics.totaleNetto),
    bold: true,
  });
  return fields;
}

export function drawPreventivoPdfRiepilogo(
  doc: jsPDF,
  startY: number,
  pageW: number,
  economics: PreventivoPdfEconomics,
): number {
  const fields = buildPreventivoPdfRiepilogoFields(economics);
  return drawGestionaleFieldSectionTable(doc, startY, pageW, "Riepilogo importi", fields, {
    valueHalign: "right",
  });
}

/** Corpo PDF preventivo/consuntivo — layout table-based (header/footer gestiti dal chiamante). */
export function drawPreventivoPdfBody(
  doc: jsPDF,
  pageW: number,
  startY: number,
  p: PreventivoRecord,
  righe: readonly PreventivoRigaOutput[],
  economics: PreventivoPdfEconomics,
  clientePdf?: PreventivoClientePdfOptions,
): number {
  let y = startY;

  const destinatario = buildPreventivoDestinatarioPdfFields(p, clientePdf);
  y = drawGestionaleCompactFieldSectionTable(doc, y, pageW, "Destinatario", destinatario);

  const oggetto = buildPreventivoOggettoInterventoPdfFields(p);
  if (oggetto.length > 0) {
    y = drawGestionaleCompactFieldSectionTable(doc, y, pageW, "Oggetto intervento", oggetto, {
      columnStyles: compactOggettoInterventoColumnStyles,
    });
  }

  const lavBody = buildLavorazioniEffettuatePdfRows(p);
  if (lavBody.length > 0) {
    y = drawGestionaleDataSectionTable(
      doc,
      y,
      pageW,
      preventivoPdfLavorazioniSectionTitle(p.tipoDocumento),
      ["Descrizione"],
      lavBody,
      LAVORAZIONI_COLUMN_STYLES,
    );
  }

  const manBody = buildManodoperaPdfRows(righe);
  y = drawGestionaleDataSectionTable(
    doc,
    y,
    pageW,
    "Manodopera",
    pdfPreventivoVoceTableColumns.head[0]!,
    manBody.length ? manBody : [["Nessuna manodopera indicata", "—", "—", "—"]],
    pdfPreventivoVoceTableColumns.columnStyles,
    { value: fmtEuroPdf(computeManodoperaSectionTotal(righe)) },
  );

  const ricBody = buildRicambiPdfRows(righe);
  y = drawGestionaleDataSectionTable(
    doc,
    y,
    pageW,
    preventivoPdfMaterialiSectionTitle(p.tipoDocumento),
    [...RICAMBI_HEAD],
    ricBody.length ? ricBody : [["—", "Nessun ricambio", "—", "—", "—", "—"]],
    RICAMBI_COLUMN_STYLES,
    ricBody.length > 0 ? { value: fmtEuroPdf(economics.totaleRicambi) } : undefined,
  );

  y = drawPreventivoPdfRiepilogo(doc, y, pageW, economics);

  const noteField = pdfFieldFromValue("Note", p.noteFinali.trim());
  if (noteField) {
    y = drawGestionaleFieldSectionTable(doc, y, pageW, "Note", [noteField], { multiline: true });
  }

  return y;
}
