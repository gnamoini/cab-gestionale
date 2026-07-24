import type { jsPDF } from "jspdf";
import {
  drawGestionaleCompactFieldSectionTable,
  drawGestionaleDataSectionTable,
  drawGestionaleFieldSectionTable,
  drawGestionaleSideBySideMetricBoxes,
  pdfFieldFromValue,
} from "@/lib/pdf/gestionale-section-table";
import {
  buildAnagraficaPdfFields,
  buildPreventivoOggettoInterventoPdfFields,
  fmtEuroPdf,
  pdfPreventivoVoceTableColumns,
  type PdfField,
} from "@/lib/pdf/core/pdf-base-template";
import {
  parsePreventivoLavorazioniClientePdfLines,
  type PreventivoRigaOutput,
} from "@/lib/preventivi/preventivi-struttura";
import { totaleNettoRigaRicambio } from "@/lib/preventivi/preventivi-totals";
import {
  PREVENTIVO_SMALTIMENTO_DESCRIZIONE,
  PREVENTIVO_SMALTIMENTO_PERCENT,
} from "@/lib/preventivi/preventivi-voci-standard";
import type { PreventivoClientePdfOptions } from "@/lib/pdf/anagrafica-pdf-fields";
import type { PreventivoRecord } from "@/lib/preventivi/types";

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
  2: { cellWidth: 12, halign: "center" as const },
  3: { cellWidth: 24, halign: "right" as const },
  4: { cellWidth: 16, halign: "center" as const },
  5: { cellWidth: 28, halign: "right" as const },
};

const LAVORAZIONI_COLUMN_STYLES = {
  0: { cellWidth: "auto" as const },
};

export function buildLavorazioniEffettuatePdfRows(p: PreventivoRecord): string[][] {
  return parsePreventivoLavorazioniClientePdfLines(p.descrizioneLavorazioniCliente).map((line) => [line]);
}

export function computeManodoperaSectionTotal(righe: readonly PreventivoRigaOutput[]): number {
  let total = 0;
  for (const r of righe) {
    if (r.sezione === "manodopera" || r.sezione === "collaudo") {
      total += r.totale;
    }
  }
  return Math.round(total * 100) / 100;
}

export function buildManodoperaPdfRows(righe: readonly PreventivoRigaOutput[]): string[][] {
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

export function buildRicambiPdfRows(righe: readonly PreventivoRigaOutput[]): string[][] {
  return righe
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

  fields.push({ label: "TOTALE NETTO (senza IVA)", value: fmtEuroPdf(economics.totaleNetto) });
  return fields;
}

export function drawPreventivoPdfRiepilogo(
  doc: jsPDF,
  startY: number,
  pageW: number,
  economics: PreventivoPdfEconomics,
): number {
  let y = startY;

  const nettoFields = buildPreventivoPdfNettoFields(economics);
  y = drawGestionaleFieldSectionTable(doc, y, pageW, "Riepilogo importi", nettoFields);

  y = drawGestionaleSideBySideMetricBoxes(
    doc,
    y,
    pageW,
    { title: `IVA (${economics.ivaPercent}%)`, value: "—" },
    { title: "Totale IVA", value: fmtEuroPdf(economics.importoIva) },
  );

  y = drawGestionaleFieldSectionTable(doc, y, pageW, "Totale documento", [
    { label: "Totale con IVA", value: fmtEuroPdf(economics.totaleConIva) },
  ]);

  return y;
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

  const destinatario = buildAnagraficaPdfFields(p, clientePdf);
  y = drawGestionaleCompactFieldSectionTable(doc, y, pageW, "Destinatario", destinatario);

  const oggetto = buildPreventivoOggettoInterventoPdfFields(p);
  if (oggetto.length > 0) {
    y = drawGestionaleCompactFieldSectionTable(doc, y, pageW, "Oggetto intervento", oggetto);
  }

  const lavBody = buildLavorazioniEffettuatePdfRows(p);
  if (lavBody.length > 0) {
    y = drawGestionaleDataSectionTable(
      doc,
      y,
      pageW,
      "Lavorazioni effettuate",
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
    "Ricambi utilizzati",
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
