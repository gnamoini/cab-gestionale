import type { jsPDF } from "jspdf";

export const SCHEDA_BLANK_TEMPLATE_VERSION = "2.0.0";

export type SchedaBlankTipo = "ingresso" | "lavorazioni" | "ricambi";

const MARGIN_L = 14;
const MARGIN_R = 14;
const CONTENT_W = 210 - MARGIN_L - MARGIN_R;
const LINE_COLOR: [number, number, number] = [0, 0, 0];
const LABEL_COLOR: [number, number, number] = [0, 0, 0];

function drawLabelLine(doc: jsPDF, label: string, y: number, labelW = 38): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...LABEL_COLOR);
  doc.text(`${label}:`, MARGIN_L, y);
  doc.setDrawColor(...LINE_COLOR);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_L + labelW, y + 1, MARGIN_L + CONTENT_W, y + 1);
  return y + 8;
}

function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...LABEL_COLOR);
  doc.text(title.toUpperCase(), MARGIN_L, y);
  doc.setDrawColor(...LINE_COLOR);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, y + 1.5, MARGIN_L + CONTENT_W, y + 1.5);
  return y + 7;
}

function drawTableWithRows(
  doc: jsPDF,
  headers: readonly string[],
  y: number,
  rowCount: number,
  headerH = 8,
  rowH = 8,
): number {
  const colW = CONTENT_W / headers.length;
  doc.setDrawColor(...LINE_COLOR);
  doc.setLineWidth(0.2);
  doc.setTextColor(...LABEL_COLOR);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  for (let i = 0; i < headers.length; i += 1) {
    const x = MARGIN_L + i * colW;
    doc.rect(x, y, colW, headerH);
    doc.text(headers[i]!, x + 1.5, y + headerH - 2.5);
  }

  doc.setFont("helvetica", "normal");
  let curY = y + headerH;
  for (let r = 0; r < rowCount; r += 1) {
    for (let i = 0; i < headers.length; i += 1) {
      doc.rect(MARGIN_L + i * colW, curY, colW, rowH);
    }
    curY += rowH;
  }
  return curY + 4;
}

function drawColumnGrid(
  doc: jsPDF,
  headers: readonly string[],
  y: number,
  rowH = 10,
): number {
  const colW = CONTENT_W / headers.length;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...LABEL_COLOR);

  for (let i = 0; i < headers.length; i += 1) {
    const x = MARGIN_L + i * colW;
    doc.text(headers[i]!, x + 1, y);
    doc.setDrawColor(...LINE_COLOR);
    doc.setLineWidth(0.2);
    doc.rect(x, y + 1, colW, rowH);
  }
  return y + rowH + 5;
}

function drawMultilineBox(doc: jsPDF, label: string, y: number, height: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...LABEL_COLOR);
  doc.text(`${label}:`, MARGIN_L, y);
  doc.setDrawColor(...LINE_COLOR);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN_L, y + 2, CONTENT_W, height);
  return y + height + 6;
}

function drawSignatureBoxes(doc: jsPDF, y: number, boxH = 18): number {
  const gap = 4;
  const boxW = (CONTENT_W - gap) / 2;
  const labels = ["Firma autista/richiedente", "Firma addetto officina"];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...LABEL_COLOR);

  for (let i = 0; i < 2; i += 1) {
    const x = MARGIN_L + i * (boxW + gap);
    doc.text(labels[i]!, x, y);
    doc.setDrawColor(...LINE_COLOR);
    doc.setLineWidth(0.2);
    doc.rect(x, y + 2, boxW, boxH);
  }
  return y + boxH + 8;
}

/** Layout CAB — stampa manuale + scansione Acquisizione AI. */
export function drawSchedaIngressoBlankPdf(doc: jsPDF): void {
  doc.setDrawColor(...LINE_COLOR);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...LABEL_COLOR);
  doc.text("SCHEDA INGRESSO MACCHINA", 105, 18, { align: "center" });

  let y = 28;
  y = drawLabelLine(doc, "Data ingresso", y);
  y = drawLabelLine(doc, "Cliente", y);
  y = drawLabelLine(doc, "Cantiere", y);
  y = drawLabelLine(doc, "Utilizzatore", y);

  y = drawSectionHeader(doc, "Attrezzatura", y);
  y = drawColumnGrid(doc, ["Marca", "Modello", "Matricola", "N. scuderia", "Ore"], y);

  y = drawSectionHeader(doc, "Telaio", y);
  y = drawColumnGrid(doc, ["Marca", "Modello", "Targa", "Km"], y);

  y = drawMultilineBox(doc, "Descrizione anomalia", y, 24);
  y = drawSignatureBoxes(doc, y);
  y = drawLabelLine(doc, "Nome", y);
  y = drawLabelLine(doc, "Cognome", y);
  y = drawLabelLine(doc, "Telefono", y);
  drawMultilineBox(doc, "Note", y, 20);
}

const LAVORAZIONI_ROWS_PER_PAGE = 12;
const LAVORAZIONI_BLANK_PAGES = 2;

function drawSchedaLavorazioniBlankPage(doc: jsPDF): void {
  doc.setDrawColor(...LINE_COLOR);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...LABEL_COLOR);
  doc.text("SCHEDA LAVORAZIONI", 105, 18, { align: "center" });

  let y = 28;
  y = drawLabelLine(doc, "Cliente", y);
  y = drawLabelLine(doc, "Targa/Matricola", y, 42);
  drawTableWithRows(doc, ["Lavorazione", "Nome", "Ore"], y, LAVORAZIONI_ROWS_PER_PAGE);
}

/** Layout CAB — 2 pagine, 12 righe tabella ciascuna. */
export function drawSchedaLavorazioniBlankPdf(doc: jsPDF): void {
  drawSchedaLavorazioniBlankPage(doc);
  for (let p = 1; p < LAVORAZIONI_BLANK_PAGES; p += 1) {
    doc.addPage();
    drawSchedaLavorazioniBlankPage(doc);
  }
}

const RICAMBI_TABLE_ROWS = 34;

/** Layout CAB — tabella ricambi + footer Cliente/Targa in fondo. */
export function drawSchedaRicambiBlankPdf(doc: jsPDF): void {
  doc.setDrawColor(...LINE_COLOR);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...LABEL_COLOR);
  doc.text("SCHEDA RICAMBI", 105, 18, { align: "center" });

  let y = 26;
  y = drawSectionHeader(doc, "Ricambi utilizzati", y);
  y = drawTableWithRows(doc, ["Nome", "Codice", "Descrizione", "Qt", "Data"], y, RICAMBI_TABLE_ROWS, 7, 6);
  y = drawLabelLine(doc, "Cliente", y);
  drawLabelLine(doc, "Targa/Matricola", y, 42);
}

export function drawSchedaBlankPdf(doc: jsPDF, tipo: SchedaBlankTipo, _generatedAt: Date): void {
  if (tipo === "ingresso") {
    drawSchedaIngressoBlankPdf(doc);
    return;
  }
  if (tipo === "lavorazioni") {
    drawSchedaLavorazioniBlankPdf(doc);
    return;
  }
  drawSchedaRicambiBlankPdf(doc);
}

export function schedaBlankPdfFileName(tipo: SchedaBlankTipo): string {
  return `scheda-${tipo}-blank-v${SCHEDA_BLANK_TEMPLATE_VERSION}.pdf`;
}
