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

const INGRESSO_BLANK_PAGE_W_MM = 210;
const INGRESSO_BLANK_PAGE_H_MM = 297;

/** Caselle firma (mm) — stessa sequenza y di drawSchedaIngressoBlankPdf. */
export function getIngressoBlankSignatureBoxesMm(): {
  richiedente: { left: number; top: number; width: number; height: number };
  addetto: { left: number; top: number; width: number; height: number };
} {
  const gap = 4;
  const boxW = (CONTENT_W - gap) / 2;
  const boxH = 18;
  let y = 28 + 8 * 4;
  y += 7 + 10 + 5;
  y += 7 + 10 + 5;
  y += 24 + 6;
  const boxTop = y + 2;
  return {
    richiedente: { left: MARGIN_L, top: boxTop, width: boxW, height: boxH },
    addetto: { left: MARGIN_L + boxW + gap, top: boxTop, width: boxW, height: boxH },
  };
}

export const ingressoBlankPageSizeMm = {
  width: INGRESSO_BLANK_PAGE_W_MM,
  height: INGRESSO_BLANK_PAGE_H_MM,
} as const;

const LAVORAZIONI_ROWS_PER_PAGE = 12;
export const LAVORAZIONI_BLANK_PAGES = 2;
const RICAMBI_TABLE_ROWS = 34;

export type SchedaBlankMmBox = { left: number; top: number; width: number; height: number };

function labelLineValueBoxMm(y: number, labelW = 38): SchedaBlankMmBox {
  const left = MARGIN_L + labelW;
  return { left, top: y - 3, width: MARGIN_L + CONTENT_W - left, height: 7 };
}

function columnGridValueBoxesMm(
  y: number,
  colCount: number,
  rowH = 10,
): SchedaBlankMmBox[] {
  const colW = CONTENT_W / colCount;
  const top = y + 1;
  return Array.from({ length: colCount }, (_, i) => ({
    left: MARGIN_L + i * colW,
    top,
    width: colW,
    height: rowH,
  }));
}

function tableCellBoxesMm(
  y: number,
  colCount: number,
  rowCount: number,
  headerH = 8,
  rowH = 8,
): SchedaBlankMmBox[] {
  const colW = CONTENT_W / colCount;
  const boxes: SchedaBlankMmBox[] = [];
  let curY = y + headerH;
  for (let r = 0; r < rowCount; r += 1) {
    for (let c = 0; c < colCount; c += 1) {
      boxes.push({
        left: MARGIN_L + c * colW,
        top: curY,
        width: colW,
        height: rowH,
      });
    }
    curY += rowH;
  }
  return boxes;
}

/** Titolo pagina (mm) — detect template CAB. */
export function getSchedaBlankTitleBoxMm(): SchedaBlankMmBox {
  return { left: 40, top: 10, width: 130, height: 12 };
}

/** Caselle valore ingresso blank v2 — stessa sequenza y di drawSchedaIngressoBlankPdf. */
export function getIngressoBlankValueBoxesMm(): Record<string, SchedaBlankMmBox> {
  let y = 28;
  const out: Record<string, SchedaBlankMmBox> = {};
  out.data_ingresso = labelLineValueBoxMm(y);
  y += 8;
  out.cliente = labelLineValueBoxMm(y);
  y += 8;
  out.cantiere = labelLineValueBoxMm(y);
  y += 8;
  out.utilizzatore = labelLineValueBoxMm(y);
  y += 8;
  y += 7;
  const attrezzaturaCols = columnGridValueBoxesMm(y, 5);
  const attrezzaturaKeys = [
    "attrezzatura_marca",
    "attrezzatura_modello",
    "attrezzatura_matricola",
    "n_scuderia",
    "ore",
  ] as const;
  attrezzaturaKeys.forEach((key, i) => {
    let box = attrezzaturaCols[i]!;
    if (key === "n_scuderia") {
      // ponytail: crop interno colonna — evita OCR su "N." dell'etichetta
      box = {
        left: box.left + box.width * 0.22,
        top: box.top + 1,
        width: box.width * 0.72,
        height: Math.max(4, box.height - 1),
      };
    }
    out[key] = box;
  });
  y += 10 + 5;
  y += 7;
  const telaioCols = columnGridValueBoxesMm(y, 4);
  const telaioKeys = ["telaio_marca", "telaio_modello", "targa", "km"] as const;
  telaioKeys.forEach((key, i) => {
    out[key] = telaioCols[i]!;
  });
  y += 10 + 5;
  out.descrizione_anomalia = { left: MARGIN_L, top: y + 2, width: CONTENT_W, height: 24 };
  y += 24 + 6;
  y += 18 + 8;
  out.nome = labelLineValueBoxMm(y);
  y += 8;
  out.cognome = labelLineValueBoxMm(y);
  y += 8;
  out.telefono = labelLineValueBoxMm(y);
  y += 8;
  out.note = { left: MARGIN_L, top: y + 2, width: CONTENT_W, height: 20 };
  return out;
}


/** Caselle valore lavorazioni blank — pageIndex 0..1 (riga 1-12 / 13-24). */
export function getLavorazioniBlankValueBoxesMm(pageIndex: number): Record<string, SchedaBlankMmBox> {
  const out: Record<string, SchedaBlankMmBox> = {};
  let y = 28;
  if (pageIndex === 0) {
    out.cliente = labelLineValueBoxMm(y);
    y += 8;
    out.targa_matricola = labelLineValueBoxMm(y, 42);
    y += 8;
  } else {
    y = 28;
  }
  const cells = tableCellBoxesMm(y, 3, LAVORAZIONI_ROWS_PER_PAGE);
  const colKeys = ["lavorazione", "nome", "ore"] as const;
  const rowOffset = pageIndex * LAVORAZIONI_ROWS_PER_PAGE;
  for (let r = 0; r < LAVORAZIONI_ROWS_PER_PAGE; r += 1) {
    const rowNum = rowOffset + r + 1;
    for (let c = 0; c < 3; c += 1) {
      out[`riga_${rowNum}_${colKeys[c]}`] = cells[r * 3 + c]!;
    }
  }
  return out;
}

/** Caselle valore ricambi blank — tabella + footer. */
export function getRicambiBlankValueBoxesMm(): Record<string, SchedaBlankMmBox> {
  const out: Record<string, SchedaBlankMmBox> = {};
  let y = 26 + 7;
  const cells = tableCellBoxesMm(y, 5, RICAMBI_TABLE_ROWS, 7, 6);
  const colKeys = ["nome", "codice", "descrizione", "qt", "data"] as const;
  for (let r = 0; r < RICAMBI_TABLE_ROWS; r += 1) {
    const rowNum = r + 1;
    for (let c = 0; c < 5; c += 1) {
      out[`riga_${rowNum}_${colKeys[c]}`] = cells[r * 5 + c]!;
    }
  }
  y += 7 + RICAMBI_TABLE_ROWS * 6 + 4;
  out.cliente = labelLineValueBoxMm(y);
  y += 8;
  out.targa_matricola = labelLineValueBoxMm(y, 42);
  return out;
}

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
