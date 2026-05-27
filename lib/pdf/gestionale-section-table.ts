import type { jsPDF } from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";
import {
  ensurePdfSpace,
  getAutoTableFinalY,
  PDF_MARGIN_L,
  PDF_MARGIN_R,
  pdfContentWidth,
  pdfTableDefaults,
  type PdfField,
} from "@/lib/pdf/core/pdf-base-template";

export const PDF_DS_SECTION_GAP = 2;
export const PDF_DS_ROW_PAD = 1.5;
export const PDF_DS_ROW_PAD_MULTILINE = 2;
export const PDF_DS_HEAD_PAD_V = 1.4;
export const PDF_DS_HEAD_PAD_H = 2.5;
export const PDF_DS_MULTILINE_MIN_H = 6;
export const PDF_DS_COL_LABEL_RATIO = 0.35;

const C_PRIMARY: [number, number, number] = [24, 24, 27];
const C_LABEL: [number, number, number] = [0, 0, 0];
const C_RULE: [number, number, number] = [229, 229, 229];
const C_HEAD_ACCENT_FILL: [number, number, number] = [255, 247, 240];
const C_ACCENT: [number, number, number] = [249, 115, 22];

export type GestionaleSideBySidePanel = { title: string; fields: PdfField[] };

export type GestionaleMetricBox = { title: string; value: string };

const PDF_DS_SIDE_GAP = 3;

export type GestionaleDataSectionTotal = { label?: string; value: string };

export type GestionaleFieldSectionOpts = { multiline?: boolean };

type DataColumnStyles = Record<
  number,
  Partial<{
    cellWidth: number | "auto" | "wrap";
    halign: "left" | "center" | "right" | "justify";
  }>
>;

function isSectionTitleHeadRow(data: CellHookData): boolean {
  return data.section === "head" && data.row.index === 0;
}

export function cleanPdfFieldValue(v: string | undefined | null): string | undefined {
  const t = String(v ?? "").trim();
  if (!t || t === "—") return undefined;
  return t;
}

export function pdfFieldFromValue(label: string, value: string | undefined): PdfField | null {
  const v = cleanPdfFieldValue(value);
  if (!v) return null;
  return { label, value: v };
}

export function pdfFieldsToBody(fields: PdfField[]): string[][] {
  return fields.map((f) => [f.label, f.value]);
}

/** Allinea due liste campi alla stessa lunghezza (righe vuote per altezza uniforme). */
export function padPdfFieldsToEqualRows(
  left: readonly PdfField[],
  right: readonly PdfField[],
): { left: PdfField[]; right: PdfField[] } {
  const max = Math.max(left.length, right.length);
  const pad = (fields: readonly PdfField[]): PdfField[] => {
    const out: PdfField[] = [...fields];
    while (out.length < max) out.push({ label: "", value: "" });
    return out;
  };
  return { left: pad(left), right: pad(right) };
}

function panelFieldColumnStyles(panelW: number, multiline: boolean) {
  return fieldColumnStyles(panelW, multiline);
}

function drawPanelFieldSectionTable(
  doc: jsPDF,
  startY: number,
  panelW: number,
  marginLeft: number,
  marginRight: number,
  title: string,
  fields: PdfField[],
  multiline = false,
): number {
  if (!fields.length) return startY;

  const y = ensurePdfSpace(doc, startY, 18);
  const hooks = gestionaleSectionTableHooks(doc);

  autoTable(doc, {
    startY: y,
    head: [[{ content: title.toUpperCase(), colSpan: 2 }]],
    body: pdfFieldsToBody(fields),
    ...baseTableStyles(),
    margin: { left: marginLeft, right: marginRight },
    tableWidth: panelW,
    headStyles: {
      fillColor: C_HEAD_ACCENT_FILL,
      textColor: C_PRIMARY,
      fontStyle: "bold",
      fontSize: 9.5,
      cellPadding: { top: PDF_DS_HEAD_PAD_V, right: PDF_DS_HEAD_PAD_H, bottom: PDF_DS_HEAD_PAD_V, left: PDF_DS_HEAD_PAD_H },
      halign: "left",
    },
    columnStyles: panelFieldColumnStyles(panelW, multiline),
    didParseCell: (data: CellHookData) => {
      hooks.didParseCell(data);
      if (data.section === "body" && !String(data.cell.raw ?? "").trim()) {
        data.cell.styles.textColor = C_PRIMARY;
      }
    },
    willDrawCell: hooks.willDrawCell,
  });

  return getAutoTableFinalY(doc, y);
}

function drawPanelMetricBox(
  doc: jsPDF,
  startY: number,
  panelW: number,
  marginLeft: number,
  marginRight: number,
  box: GestionaleMetricBox,
  valueHalign: "left" | "right" = "right",
): number {
  const y = ensurePdfSpace(doc, startY, 14);
  const hooks = gestionaleSectionTableHooks(doc);

  autoTable(doc, {
    startY: y,
    head: [[{ content: box.title.toUpperCase(), colSpan: 1 }]],
    body: [[box.value]],
    ...baseTableStyles(),
    margin: { left: marginLeft, right: marginRight },
    tableWidth: panelW,
    headStyles: {
      fillColor: C_HEAD_ACCENT_FILL,
      textColor: C_PRIMARY,
      fontStyle: "bold",
      fontSize: 9.5,
      cellPadding: { top: PDF_DS_HEAD_PAD_V, right: PDF_DS_HEAD_PAD_H, bottom: PDF_DS_HEAD_PAD_V, left: PDF_DS_HEAD_PAD_H },
      halign: "left",
    },
    columnStyles: {
      0: {
        fontSize: 10,
        textColor: C_PRIMARY,
        fontStyle: "bold" as const,
        cellPadding: PDF_DS_ROW_PAD,
        halign: valueHalign,
      },
    },
    didParseCell: hooks.didParseCell,
    willDrawCell: hooks.willDrawCell,
  });

  return getAutoTableFinalY(doc, y);
}

function sideBySidePanelLayout(pageW: number, gapMm = PDF_DS_SIDE_GAP) {
  const contentW = pdfContentWidth(pageW);
  const panelW = (contentW - gapMm) / 2;
  const rightMarginLeft = PDF_MARGIN_L + panelW + gapMm;
  return { panelW, rightMarginLeft, gapMm };
}

function fieldColumnStyles(contentW: number, multiline: boolean) {
  const labelW = contentW * PDF_DS_COL_LABEL_RATIO;
  const valueW = contentW * (1 - PDF_DS_COL_LABEL_RATIO);
  const cellPadding = multiline ? PDF_DS_ROW_PAD_MULTILINE : PDF_DS_ROW_PAD;

  return {
    0: {
      cellWidth: labelW,
      fontSize: 9,
      textColor: C_LABEL,
      fontStyle: "normal" as const,
      valign: "top" as const,
      cellPadding,
    },
    1: {
      cellWidth: valueW,
      fontSize: 10,
      textColor: C_PRIMARY,
      fontStyle: "normal" as const,
      valign: "top" as const,
      cellPadding,
      ...(multiline ? { minCellHeight: PDF_DS_MULTILINE_MIN_H } : {}),
    },
  };
}

function baseTableStyles() {
  return {
    theme: "grid" as const,
    margin: pdfTableDefaults.margin,
    tableLineWidth: 0.1,
    tableLineColor: C_RULE,
    styles: {
      overflow: "linebreak" as const,
      lineColor: C_RULE,
      lineWidth: 0.1,
      font: "helvetica" as const,
    },
    bodyStyles: {
      fillColor: 255 as const,
    },
  };
}

export function gestionaleSectionTableHooks(doc: jsPDF) {
  return {
    didParseCell: (data: CellHookData) => {
      if (isSectionTitleHeadRow(data)) {
        data.cell.styles.fillColor = C_HEAD_ACCENT_FILL;
        data.cell.styles.textColor = C_PRIMARY;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9.5;
        data.cell.styles.cellPadding = {
          top: PDF_DS_HEAD_PAD_V,
          right: PDF_DS_HEAD_PAD_H,
          bottom: PDF_DS_HEAD_PAD_V,
          left: PDF_DS_HEAD_PAD_H,
        };
        return;
      }
      if (data.section === "head") {
        data.cell.styles.fillColor = 255;
        data.cell.styles.textColor = C_PRIMARY;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 8.5;
        data.cell.styles.cellPadding = PDF_DS_ROW_PAD;
      }
    },
    willDrawCell: (data: CellHookData) => {
      if (!isSectionTitleHeadRow(data)) return;
      const { x, y, width, height } = data.cell;
      doc.setDrawColor(...C_ACCENT);
      doc.setLineWidth(0.5);
      doc.line(x, y, x + width, y);
      doc.setLineWidth(0.35);
      doc.line(x, y, x, y + height);
    },
  };
}

/** Sezione label | value (2 colonne) con header arancione compatto. */
export function drawGestionaleFieldSectionTable(
  doc: jsPDF,
  startY: number,
  pageW: number,
  title: string,
  fields: PdfField[],
  opts?: GestionaleFieldSectionOpts,
): number {
  if (!fields.length) return startY;

  const multiline = opts?.multiline ?? false;
  const contentW = pdfContentWidth(pageW);
  const y = ensurePdfSpace(doc, startY, 18);
  const hooks = gestionaleSectionTableHooks(doc);

  autoTable(doc, {
    startY: y,
    head: [[{ content: title.toUpperCase(), colSpan: 2 }]],
    body: pdfFieldsToBody(fields),
    ...baseTableStyles(),
    headStyles: {
      fillColor: C_HEAD_ACCENT_FILL,
      textColor: C_PRIMARY,
      fontStyle: "bold",
      fontSize: 9.5,
      cellPadding: { top: PDF_DS_HEAD_PAD_V, right: PDF_DS_HEAD_PAD_H, bottom: PDF_DS_HEAD_PAD_V, left: PDF_DS_HEAD_PAD_H },
      halign: "left",
    },
    columnStyles: fieldColumnStyles(contentW, multiline),
    didParseCell: hooks.didParseCell,
    willDrawCell: hooks.willDrawCell,
  });

  return getAutoTableFinalY(doc, y) + PDF_DS_SECTION_GAP;
}

/** Due sezioni label|value affiancate (Attrezzatura + Telaio/Mezzo). */
export function drawGestionaleSideBySideFieldSections(
  doc: jsPDF,
  startY: number,
  pageW: number,
  left: GestionaleSideBySidePanel,
  right: GestionaleSideBySidePanel,
  gapMm = PDF_DS_SIDE_GAP,
): number {
  if (!left.fields.length && !right.fields.length) return startY;

  const { panelW, rightMarginLeft } = sideBySidePanelLayout(pageW, gapMm);
  const padded = padPdfFieldsToEqualRows(left.fields, right.fields);
  const y = ensurePdfSpace(doc, startY, 18);

  const leftFinal = left.fields.length
    ? drawPanelFieldSectionTable(doc, y, panelW, PDF_MARGIN_L, pageW - PDF_MARGIN_L - panelW, left.title, padded.left)
    : y;
  const rightFinal = right.fields.length
    ? drawPanelFieldSectionTable(
        doc,
        y,
        panelW,
        rightMarginLeft,
        PDF_MARGIN_R,
        right.title,
        padded.right,
      )
    : y;

  return Math.max(leftFinal, rightFinal) + PDF_DS_SECTION_GAP;
}

/** Due box metrica affiancati (es. IVA % | Totale IVA). */
export function drawGestionaleSideBySideMetricBoxes(
  doc: jsPDF,
  startY: number,
  pageW: number,
  left: GestionaleMetricBox,
  right: GestionaleMetricBox,
  gapMm = PDF_DS_SIDE_GAP,
): number {
  const { panelW, rightMarginLeft } = sideBySidePanelLayout(pageW, gapMm);
  const y = ensurePdfSpace(doc, startY, 14);

  const leftFinal = drawPanelMetricBox(doc, y, panelW, PDF_MARGIN_L, pageW - PDF_MARGIN_L - panelW, left, "left");
  const rightFinal = drawPanelMetricBox(doc, y, panelW, rightMarginLeft, PDF_MARGIN_R, right, "right");

  return Math.max(leftFinal, rightFinal) + PDF_DS_SECTION_GAP;
}

/** Sezione dati multi-colonna: titolo sezione + header colonne + righe body. */
export function drawGestionaleDataSectionTable(
  doc: jsPDF,
  startY: number,
  pageW: number,
  title: string,
  headColumns: readonly string[],
  body: string[][],
  columnStyles?: DataColumnStyles,
  sectionTotal?: GestionaleDataSectionTotal,
): number {
  if (!headColumns.length) return startY;

  const colCount = headColumns.length;
  const y = ensurePdfSpace(doc, startY, 18);
  const baseHooks = gestionaleSectionTableHooks(doc);
  const totalLabel = sectionTotal?.label?.trim() || "TOTALE";

  const mergedColumnStyles: Record<number, object> = {};
  for (let i = 0; i < colCount; i += 1) {
    mergedColumnStyles[i] = {
      fontSize: 9,
      textColor: C_PRIMARY,
      fontStyle: "normal" as const,
      valign: "top" as const,
      cellPadding: PDF_DS_ROW_PAD,
      ...columnStyles?.[i],
    };
  }

  autoTable(doc, {
    startY: y,
    tableWidth: pdfContentWidth(pageW),
    head: [[{ content: title.toUpperCase(), colSpan: colCount }], [...headColumns]],
    body,
    foot: sectionTotal
      ? [
          [
            { content: totalLabel, colSpan: colCount - 1, styles: { halign: "left" as const, fontStyle: "bold" as const } },
            { content: sectionTotal.value, styles: { halign: "right" as const, fontStyle: "bold" as const } },
          ],
        ]
      : undefined,
    ...baseTableStyles(),
    headStyles: {
      fillColor: C_HEAD_ACCENT_FILL,
      textColor: C_PRIMARY,
      fontStyle: "bold",
      fontSize: 9.5,
      cellPadding: { top: PDF_DS_HEAD_PAD_V, right: PDF_DS_HEAD_PAD_H, bottom: PDF_DS_HEAD_PAD_V, left: PDF_DS_HEAD_PAD_H },
      halign: "left",
    },
    footStyles: {
      fillColor: 255,
      textColor: C_PRIMARY,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: PDF_DS_ROW_PAD,
    },
    columnStyles: mergedColumnStyles,
    didParseCell: (data: CellHookData) => {
      baseHooks.didParseCell(data);
      if (data.section === "foot") {
        data.cell.styles.fillColor = 255;
        data.cell.styles.textColor = C_PRIMARY;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9;
        data.cell.styles.cellPadding = PDF_DS_ROW_PAD;
        if (data.column.index === colCount - 1) {
          data.cell.styles.halign = "right";
        }
      }
    },
    willDrawCell: baseHooks.willDrawCell,
  });

  return getAutoTableFinalY(doc, y) + PDF_DS_SECTION_GAP;
}
