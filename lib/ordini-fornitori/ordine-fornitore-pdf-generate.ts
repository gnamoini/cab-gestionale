import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PDF_MARGIN_L,
  PDF_MARGIN_R,
  drawPdfBrandBlock,
  drawPdfPageFooters,
  ensurePdfSpace,
  fmtDateIt,
  fmtEuroPdf,
  getAutoTableFinalY,
  pdfAdvanceAfterDocumentHeader,
  pdfContentWidth,
  pdfTableDefaults,
  type PdfField,
} from "@/lib/pdf/core/pdf-base-template";
import type { CellHookData } from "jspdf-autotable";
import {
  drawAutoTableHeadBottomBorder,
} from "@/lib/pdf/gestionale-section-table";
import {
  ordineFornitoreFornitorePdfFields,
  parseOrdineFornitoreFornitoreSnapshot,
} from "@/lib/ordini-fornitori/fornitore-snapshot";
import {
  ordineFornitoreDestinatarioPdfFields,
  parseOrdineFornitoreDestinatarioSnapshot,
} from "@/lib/ordini-fornitori/destinatario-snapshot";
import { ordineFornitoreLogisticaPdfFields } from "@/lib/ordini-fornitori/ordine-fornitore-logistica";
import { readOrdineOggetto } from "@/lib/ordini-fornitori/ordine-fornitore-oggetto";
import { formatRicambioUnitaMisuraLabel } from "@/lib/magazzino/ricambio-unita-misura";
import { splitOrdineRighe } from "@/lib/ordini-fornitori/ordine-fornitore-spesa-varia";
import { calcolaTotaliOrdineFornitore } from "@/lib/ordini-fornitori/ordine-fornitore-totals";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";

const C_PRIMARY: [number, number, number] = [24, 24, 27];
const C_SECONDARY: [number, number, number] = [82, 82, 91];
const INTRO_ORDINE = "Vi trasmettiamo ordine dei seguenti prodotti";

const RIGHE_HEAD = ["Codice", "Descrizione", "Q.tà", "U.M.", "Prezzo", "Sc. %", "Importo", "IVA"] as const;
const RIGHE_WEIGHTS = [18, 48, 11, 11, 18, 12, 20, 10] as const;

const LOGISTICA_HEAD = ["Trasporto", "Causale", "Porto", "Colli", "Peso", "Aspetto"] as const;
const LOGISTICA_WEIGHTS = [28, 30, 22, 12, 14, 24] as const;

type HAlign = "left" | "center" | "right";

const ORDINE_HEAD_FILL: [number, number, number] = [255, 247, 240];
const ORDINE_TITLE_TOP_GAP_MM = 8;
const ORDINE_POST_RIGHE_GAP_MM = 7;

type OrdineTableOpts = {
  compact?: boolean;
  gapBefore?: number;
  gapAfter?: number;
};

/** Tabelle dati ordine: niente hook sezione gestionale (row 0 = colonne, non titolo). */
function ordinePlainTableHooks(doc: jsPDF) {
  return {
    didParseCell: (data: CellHookData) => {
      if (data.section !== "head") return;
      data.cell.styles.overflow = "hidden";
      data.cell.styles.minCellHeight = 5.5;
      data.cell.styles.cellPadding = { top: 1.2, right: 0.8, bottom: 1.2, left: 0.8 };
      data.cell.styles.valign = "middle";
      data.cell.styles.fontSize = 7;
      data.cell.styles.fontStyle = "bold";
      data.cell.styles.fillColor = ORDINE_HEAD_FILL;
    },
    didDrawCell: (data: CellHookData) => {
      drawAutoTableHeadBottomBorder(doc, data);
    },
  };
}

function drawIntroBeforeRighe(doc: jsPDF, startY: number): number {
  const y = ensurePdfSpace(doc, startY + 2, 8);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...C_SECONDARY);
  doc.text(INTRO_ORDINE, PDF_MARGIN_L, y);
  return y + 4.5;
}

function scaleColumnStyles(
  weights: readonly number[],
  contentW: number,
  haligns?: readonly HAlign[],
): Record<number, { cellWidth: number; halign: HAlign; fontSize?: number }> {
  const sum = weights.reduce((acc, w) => acc + w, 0);
  const scale = contentW / sum;
  const out: Record<number, { cellWidth: number; halign: HAlign; fontSize?: number }> = {};
  weights.forEach((w, i) => {
    out[i] = {
      cellWidth: w * scale,
      halign: haligns?.[i] ?? (i === 0 ? "left" : i >= weights.length - 2 ? "right" : "center"),
      fontSize: i === 0 ? 8 : undefined,
    };
  });
  return out;
}

function pdfFieldsToBlockText(fields: PdfField[]): string {
  return fields
    .map((f) => f.value.trim())
    .filter(Boolean)
    .join("\n");
}

export function buildOrdineFornitorePartyBlocks(record: OrdineFornitoreRecord): {
  destinazione: string;
  fornitore: string;
} {
  const fornitoreFields = ordineFornitoreFornitorePdfFields(
    record.fornitoreLabel,
    parseOrdineFornitoreFornitoreSnapshot(record.fornitoreSnapshot, record.fornitoreLabel),
  ).map((f) => ({ label: f.label, value: f.value ?? "" }));

  const destinatario = parseOrdineFornitoreDestinatarioSnapshot(record.destinazioneSnapshot, record.destinazione);
  const destFields = ordineFornitoreDestinatarioPdfFields(destinatario).map((f) => ({
    label: f.label,
    value: f.value ?? "",
  }));

  const fornitore = pdfFieldsToBlockText(fornitoreFields) || record.fornitoreLabel.trim() || "—";
  const destinazione = pdfFieldsToBlockText(destFields) || "—";
  return { destinazione, fornitore };
}

function drawFullWidthTable(
  doc: jsPDF,
  startY: number,
  pageW: number,
  head: readonly string[],
  body: string[][],
  weights: readonly number[],
  haligns?: readonly HAlign[],
  opts?: OrdineTableOpts,
): number {
  if (!head.length) return startY;
  const compact = opts?.compact ?? false;
  const gapBefore = opts?.gapBefore ?? 0;
  const gapAfter = opts?.gapAfter ?? (compact ? 0.5 : 2);
  const contentW = pdfContentWidth(pageW);
  const y = ensurePdfSpace(doc, startY + gapBefore, compact ? 10 : 16);
  const hooks = ordinePlainTableHooks(doc);

  autoTable(doc, {
    startY: y,
    tableWidth: contentW,
    margin: { left: PDF_MARGIN_L, right: PDF_MARGIN_R },
    head: [head.map((h) => h)],
    body,
    theme: "grid",
    styles: {
      ...pdfTableDefaults.styles,
      fontSize: compact ? 7.5 : 8.5,
      cellPadding: compact ? 0.8 : 2,
      overflow: "linebreak",
      minCellHeight: compact ? 4.5 : undefined,
    },
    headStyles: {
      ...pdfTableDefaults.headStyles,
      fontSize: compact ? 6.5 : 7,
      fillColor: ORDINE_HEAD_FILL,
      overflow: "hidden",
      cellPadding: compact
        ? { top: 1, right: 0.6, bottom: 1, left: 0.6 }
        : { top: 1.2, right: 0.8, bottom: 1.2, left: 0.8 },
      minCellHeight: compact ? 4.8 : 5.5,
      valign: "middle",
    },
    columnStyles: scaleColumnStyles(weights, contentW, haligns),
    didParseCell: hooks.didParseCell,
    didDrawCell: hooks.didDrawCell,
  });

  return getAutoTableFinalY(doc, y) + gapAfter;
}

function drawOrdinePartyColumns(doc: jsPDF, startY: number, pageW: number, dest: string, forn: string): number {
  const contentW = pdfContentWidth(pageW);
  const colW = contentW / 2;
  const y = ensurePdfSpace(doc, startY, 20);
  const hooks = ordinePlainTableHooks(doc);

  autoTable(doc, {
    startY: y,
    tableWidth: contentW,
    margin: { left: PDF_MARGIN_L, right: PDF_MARGIN_R },
    head: [["Destinazione", "Fornitore"]],
    body: [[dest, forn]],
    theme: "grid",
    styles: {
      ...pdfTableDefaults.styles,
      fontSize: 9,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      ...pdfTableDefaults.headStyles,
      fontSize: 7.5,
      fillColor: ORDINE_HEAD_FILL,
      overflow: "hidden",
      cellPadding: { top: 1.2, right: 1, bottom: 1.2, left: 1 },
      minCellHeight: 5.5,
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: colW, halign: "left" },
      1: { cellWidth: colW, halign: "left" },
    },
    didParseCell: hooks.didParseCell,
    didDrawCell: hooks.didDrawCell,
  });

  return getAutoTableFinalY(doc, y) + 3;
}

function drawOrdineHeader(doc: jsPDF, pageW: number, record: OrdineFornitoreRecord, logoDataUrl: string | null): number {
  let y = drawPdfBrandBlock(doc, pageW, 18, logoDataUrl);
  y = pdfAdvanceAfterDocumentHeader(y);
  y += ORDINE_TITLE_TOP_GAP_MM;

  const num = record.numero.trim() || "—";
  const oggetto = record.oggettoOrdine.trim() || readOrdineOggetto(record.meta);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C_PRIMARY);
  doc.text(`Ordine a Fornitore n. ${num} del ${fmtDateIt(record.dataOrdine)}`, PDF_MARGIN_L, y);
  y += 5.5;

  if (oggetto) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Oggetto: ${oggetto}`, PDF_MARGIN_L, y);
    y += 5;
  }

  return y;
}

function logisticaGridRow(record: OrdineFornitoreRecord): string[] {
  const map = new Map(
    ordineFornitoreLogisticaPdfFields(record.logisticaSnapshot).map((f) => [f.label, f.value] as const),
  );
  return [
    map.get("Spedizione a cura di") ?? "",
    map.get("Causale trasporto") ?? "",
    map.get("Porto") ?? "",
    map.get("N. colli") ?? "",
    map.get("Peso") ?? "",
    map.get("Aspetto esteriore") ?? "",
  ];
}

function buildNoteBlock(record: OrdineFornitoreRecord): string {
  const map = new Map(
    ordineFornitoreLogisticaPdfFields(record.logisticaSnapshot).map((f) => [f.label, f.value] as const),
  );
  const lines: string[] = [];
  const vettore = map.get("Vettore");
  if (vettore) lines.push(`Vettore: ${vettore}`);
  const rif = map.get("Riferimento ordine");
  if (rif) lines.push(`Rif. Ordine: ${rif}`);
  const dataConsegna = map.get("Data consegna");
  if (dataConsegna) lines.push(`Data consegna: ${fmtDateIt(dataConsegna)}`);
  if (record.note.trim()) lines.push(record.note.trim());
  return lines.join("\n");
}

function drawOrdineTotals(
  doc: jsPDF,
  startY: number,
  pageW: number,
  imponibile: number,
  iva: number,
  totale: number,
): number {
  const x = pageW - PDF_MARGIN_R;
  let y = ensurePdfSpace(doc, startY + 4, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C_PRIMARY);
  doc.text(`Totale ordine: ${fmtEuroPdf(imponibile)}`, x, y, { align: "right" });
  y += 5;
  doc.text(`IVA: ${fmtEuroPdf(iva)}`, x, y, { align: "right" });
  y += 5.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(`Totale: ${fmtEuroPdf(totale)}`, x, y, { align: "right" });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Firma", PDF_MARGIN_L, y);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(PDF_MARGIN_L + 14, y + 0.8, PDF_MARGIN_L + 80, y + 0.8);

  return y + 6;
}

export function drawOrdineFornitorePdfBody(
  doc: jsPDF,
  pageW: number,
  startY: number,
  record: OrdineFornitoreRecord,
): number {
  let y = startY;

  const parties = buildOrdineFornitorePartyBlocks(record);
  y = drawOrdinePartyColumns(doc, y, pageW, parties.destinazione, parties.fornitore);

  const { oggetti, speseVarie } = splitOrdineRighe(record.righe);
  const totals = calcolaTotaliOrdineFornitore({ righe: record.righe, trasporto: 0, ivaPercent: record.ivaPercent });

  const righeBody = oggetti.map((row) => [
    row.codice.trim() || "—",
    row.descrizione,
    row.quantita.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 3 }),
    formatRicambioUnitaMisuraLabel(row.unitaMisura),
    row.prezzoUnitario.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    row.scontoPercent > 0
      ? row.scontoPercent.toLocaleString("it-IT", { maximumFractionDigits: 1 })
      : "0",
    row.totaleRiga.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    String(row.ivaPercent),
  ]);

  y = drawIntroBeforeRighe(doc, y);
  y = drawFullWidthTable(
    doc,
    y,
    pageW,
    RIGHE_HEAD,
    righeBody.length > 0 ? righeBody : [["—", "Nessuna riga", "—", "—", "—", "—", "—", "—"]],
    RIGHE_WEIGHTS,
    ["left", "left", "right", "center", "right", "right", "right", "center"],
  );

  if (speseVarie.length > 0) {
    const speseBody = speseVarie.map((row) => [
      row.descrizione,
      "—",
      "1",
      "—",
      row.prezzoUnitario.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      "0",
      row.totaleRiga.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      String(row.ivaPercent),
    ]);
    y = drawFullWidthTable(
      doc,
      y,
      pageW,
      RIGHE_HEAD,
      speseBody,
      RIGHE_WEIGHTS,
      ["left", "left", "right", "center", "right", "right", "right", "center"],
    );
  }

  const logisticaRow = logisticaGridRow(record);
  const secondaryCompact: OrdineTableOpts = { compact: true, gapAfter: 0.5 };
  let secondaryStarted = false;
  const secondaryOpts = (): OrdineTableOpts =>
    secondaryStarted ? secondaryCompact : { ...secondaryCompact, gapBefore: ORDINE_POST_RIGHE_GAP_MM };

  if (logisticaRow.some((v) => v.trim())) {
    y = drawFullWidthTable(
      doc,
      y,
      pageW,
      LOGISTICA_HEAD,
      [logisticaRow],
      LOGISTICA_WEIGHTS,
      ["left", "left", "left", "center", "center", "left"],
      secondaryOpts(),
    );
    secondaryStarted = true;
  }

  const pagamento = ordineFornitoreLogisticaPdfFields(record.logisticaSnapshot).find(
    (f) => f.label === "Metodo di pagamento",
  )?.value;
  y = drawFullWidthTable(
    doc,
    y,
    pageW,
    ["Pagamento", "Data ordine"],
    [[pagamento ?? "", fmtDateIt(record.dataOrdine)]],
    [82, 38],
    ["left", "left"],
    secondaryOpts(),
  );
  secondaryStarted = true;

  const noteText = buildNoteBlock(record);
  if (noteText.trim()) {
    y = drawFullWidthTable(doc, y, pageW, ["Note"], [[noteText]], [100], ["left"], secondaryOpts());
  }

  return drawOrdineTotals(doc, y, pageW, totals.imponibile, totals.iva, totals.totale);
}

export function generateOrdineFornitorePdfBytes(
  record: OrdineFornitoreRecord,
  logoDataUrl: string | null,
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const num = record.numero || "—";

  const y = drawOrdineHeader(doc, pageW, record, logoDataUrl);
  drawOrdineFornitorePdfBody(doc, pageW, y, record);
  drawPdfPageFooters(doc, num);

  return new Uint8Array(doc.output("arraybuffer"));
}

export function ordineFornitorePdfFileName(record: OrdineFornitoreRecord): string {
  const safeForn = record.fornitoreLabel.replace(/[^\w\-]+/g, "_").slice(0, 30);
  const safeNum = (record.numero || "ordine").replace("/", "-");
  return `Ordine_${safeNum}_${safeForn}.pdf`;
}

/** @deprecated Test helper — oggetto ora in header. */
export function buildOrdineFornitoreDatiOrdinePdfFields(record: OrdineFornitoreRecord): PdfField[] {
  const oggetto = record.oggettoOrdine.trim() || readOrdineOggetto(record.meta);
  return oggetto ? [{ label: "Oggetto ordine", value: oggetto }] : [];
}
