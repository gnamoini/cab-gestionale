import { jsPDF, type jsPDF as JsPDFDoc } from "jspdf";
import type { CellInput, RowInput } from "jspdf-autotable";
import {
  formatAbsenceCellDipendentePdf,
  formatAbsenceCellShortLabel,
  formatOrdinarieCellPdf,
  formatStraordinarieCellPdf,
  formatTimesheetDayHeaderGrid,
  formatTimesheetDayLabelPdf,
  formatWorkCellShortLabel,
} from "@/lib/dipendenti/timesheet-cell-display";
import {
  employeeDisplayName,
  entriesForEmployee,
  type DipendentiPdfContext,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-context";
import {
  computeTimesheetGridColumnWidths,
  TIMESHEET_PDF_SIDE_MARGIN_MM,
} from "@/lib/dipendenti/pdf/dipendenti-pdf-grid-layout";
import { buildMonthDays, formatMonthLabel } from "@/lib/dipendenti/timesheet-month";
import { computeMonthTotals, entryToCellValue } from "@/lib/dipendenti/timesheet-totals";
import type { DipendenteTimesheetEmployeeRow, TimesheetMonthKey } from "@/lib/dipendenti/types";
import {
  drawGestionaleDataSectionTable,
  headRowCellsForPdf,
  type GestionaleDataSectionTableLayout,
  PDF_GESTIONALE_MUTED_FILL,
} from "@/lib/pdf/gestionale-section-table";
import { loadBrandingLogoDataUrl } from "@/lib/branding/branding-logo-for-pdf";
import {
  drawGestionalePdfHeader,
  drawPdfPageFooters,
  pdfAdvanceSection,
  pdfContentWidth,
} from "@/lib/pdf/core/pdf-base-template";

function fmtOre(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "—";
  return String(v);
}

function timesheetComplessivoTitle(monthKey: TimesheetMonthKey): string {
  return `TABELLA PRESENZE ${formatMonthLabel(monthKey).toUpperCase()}`;
}

function timesheetDipendenteTitle(monthKey: TimesheetMonthKey, displayName: string): string {
  return `${timesheetComplessivoTitle(monthKey)} — ${displayName.toUpperCase()}`;
}

type PresenzeMonthlyGridOptions = {
  employees?: readonly DipendenteTimesheetEmployeeRow[];
  showFooterTotals?: boolean;
};

export async function buildDipendentePdf(
  ctx: DipendentiPdfContext,
  employee: DipendenteTimesheetEmployeeRow,
): Promise<JsPDFDoc> {
  const logoDataUrl = await loadBrandingLogoDataUrl();
  const displayName = employeeDisplayName(employee, ctx.entries);
  const title = timesheetDipendenteTitle(ctx.monthKey, displayName);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = drawGestionalePdfHeader(doc, pageW, title, { metaDivider: false, logoDataUrl });
  y = pdfAdvanceSection(y);

  drawDipendentePresenzeVerticalTable(doc, ctx, employee, y, pageW, title);

  drawPdfPageFooters(doc, title);
  return doc;
}

export async function buildComplessivoPdf(ctx: DipendentiPdfContext): Promise<JsPDFDoc> {
  if (ctx.employees.length === 0) {
    throw new Error("Nessun dipendente da esportare.");
  }

  const logoDataUrl = await loadBrandingLogoDataUrl();
  const title = timesheetComplessivoTitle(ctx.monthKey);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = drawGestionalePdfHeader(doc, pageW, title, { metaDivider: false, logoDataUrl });
  y = pdfAdvanceSection(y);

  drawPresenzeMonthlyGrid(doc, ctx, y, pageW, title, { showFooterTotals: true });

  drawPdfPageFooters(doc, title);
  return doc;
}

function roundOreSum(v: number): number {
  return Math.round(v * 100) / 100;
}

const TIMESHEET_PDF_BODY_FONT_SIZE = 6;
const TIMESHEET_PDF_DAY_NUM_FONT_SIZE = 7;

/** Altezza minima celle body griglia mensile (mm). */
export const TIMESHEET_PDF_MIN_CELL_HEIGHT_MM = 5.5;

/** Padding compatto colonne giorno (griglia mensile PDF). */
export const TIMESHEET_PDF_DAY_CELL_PAD = {
  top: 0.4,
  right: 0.25,
  bottom: 0.4,
  left: 0.25,
} as const;

const TIMESHEET_PDF_ABSENCE_LABEL_CELL_PAD = {
  top: 0.3,
  right: 0.2,
  bottom: 0.3,
  left: 0.2,
} as const;

/** Cella dati griglia mensile (presenze, totali numerici). */
export function pdfGridBodyCell(content: string): CellInput {
  return {
    content,
    styles: {
      fontSize: TIMESHEET_PDF_BODY_FONT_SIZE,
      halign: "center",
      valign: "middle",
      cellPadding: TIMESHEET_PDF_DAY_CELL_PAD,
    },
  };
}

/** Riga assenza dipendente: etichetta compatta (`8 FES`). */
export function pdfMutedAbsenceLabelCell(content: string): CellInput {
  return {
    content,
    styles: {
      fillColor: PDF_GESTIONALE_MUTED_FILL,
      fontSize: TIMESHEET_PDF_BODY_FONT_SIZE,
      halign: "center",
      valign: "middle",
      cellPadding: TIMESHEET_PDF_ABSENCE_LABEL_CELL_PAD,
      overflow: "visible",
    },
  };
}

/** Riga assenza: totali numerici. */
export function pdfMutedTotalCell(content: string): CellInput {
  return {
    content,
    styles: {
      fillColor: PDF_GESTIONALE_MUTED_FILL,
      fontSize: TIMESHEET_PDF_BODY_FONT_SIZE,
      halign: "center",
      valign: "middle",
      cellPadding: TIMESHEET_PDF_DAY_CELL_PAD,
    },
  };
}

function pdfMutedCell(content: string, fontSize = 6): CellInput {
  return {
    content,
    styles: { fillColor: PDF_GESTIONALE_MUTED_FILL, fontSize, halign: "center" },
  };
}

function formatEmployeeNamePdfLines(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]}\n${parts.slice(1).join(" ")}`;
}

function cellForDay(
  empEntries: ReturnType<typeof entriesForEmployee>,
  dateYmd: string,
): ReturnType<typeof entryToCellValue> {
  return entryToCellValue(empEntries.find((e) => e.work_date === dateYmd));
}

function pdfTableCellContent(cell: CellInput): string {
  if (typeof cell === "string" || typeof cell === "number") return String(cell);
  if (cell && typeof cell === "object" && "content" in cell) {
    const content = cell.content;
    return content == null ? "" : String(content);
  }
  return "";
}

function pdfWeekendRow(cells: RowInput): RowInput {
  return headRowCellsForPdf(cells).map((c) => pdfMutedCell(pdfTableCellContent(c))) as RowInput;
}

/** PDF singolo dipendente: una riga per giorno, colonne Presenze e Assenze. */
function drawDipendentePresenzeVerticalTable(
  doc: JsPDFDoc,
  ctx: DipendentiPdfContext,
  employee: DipendenteTimesheetEmployeeRow,
  startY: number,
  pageW: number,
  sectionTitle: string,
): number {
  const empEntries = entriesForEmployee(employee.id, ctx.entries);
  const totals = computeMonthTotals(empEntries);
  const days = buildMonthDays(ctx.monthKey);
  const contentW = pdfContentWidth(pageW);

  const headRow: RowInput = [
    { content: "Giorno", styles: { halign: "left", fontSize: 7.5, fontStyle: "bold" } },
    { content: "Presenze", styles: { halign: "center", fontSize: 7.5, fontStyle: "bold" } },
    { content: "Straordinari", styles: { halign: "center", fontSize: 7.5, fontStyle: "bold" } },
    { content: "Assenze", styles: { halign: "center", fontSize: 7.5, fontStyle: "bold" } },
  ];

  const body: RowInput[] = days.map((d) => {
    const cell = cellForDay(empEntries, d.dateYmd);
    const row: RowInput = [
      {
        content: formatTimesheetDayLabelPdf(d),
        styles: { halign: "left", fontSize: 8, valign: "middle" },
      },
      formatOrdinarieCellPdf(cell),
      formatStraordinarieCellPdf(cell),
      formatAbsenceCellDipendentePdf(cell, ctx.tipiAssenza),
    ];
    return d.isWeekend ? pdfWeekendRow(row) : row;
  });

  body.push([
    { content: "Totali", styles: { halign: "left", fontStyle: "bold", fontSize: 8 } },
    fmtOre(totals.oreOrdinarie),
    fmtOre(totals.oreStraordinarie),
    fmtOre(totals.oreAssenza),
  ]);

  const colGiorno = contentW * 0.26;
  const colData = (contentW - colGiorno) / 3;

  return drawGestionaleDataSectionTable(doc, startY, pageW, sectionTitle, headRow, body, {
    0: { cellWidth: colGiorno, halign: "left", overflow: "linebreak", fontSize: 8 },
    1: { cellWidth: colData, halign: "center", overflow: "hidden", fontSize: 8 },
    2: { cellWidth: colData, halign: "center", overflow: "hidden", fontSize: 8 },
    3: { cellWidth: colData, halign: "center", overflow: "hidden", fontSize: 8 },
  });
}

/** Griglia mensile orizzontale (PDF complessivo): 2 righe per dipendente, totali per colonna e per riga. */
function drawPresenzeMonthlyGrid(
  doc: JsPDFDoc,
  ctx: DipendentiPdfContext,
  startY: number,
  pageW: number,
  sectionTitle: string,
  options: PresenzeMonthlyGridOptions = {},
): number {
  const employees = options.employees ?? ctx.employees;
  const showFooterTotals = options.showFooterTotals ?? true;
  const days = buildMonthDays(ctx.monthKey);
  const weekendColumnIndexes = days
    .map((d, index) => (d.isWeekend ? index + 1 : -1))
    .filter((index) => index > 0);
  const { tableW, nameColW, totColW, dayColWidths } = computeTimesheetGridColumnWidths(pageW, days);
  const tableLayout: GestionaleDataSectionTableLayout = {
    marginLeft: TIMESHEET_PDF_SIDE_MARGIN_MM,
    marginRight: TIMESHEET_PDF_SIDE_MARGIN_MM,
    tableWidth: tableW,
    weekendColumnIndexes,
  };
  const headRow: CellInput[] = [
    { content: "Nome", styles: { halign: "left", fontSize: 7.5, fontStyle: "bold", valign: "middle" } },
    ...days.map((d) => ({
      content: formatTimesheetDayHeaderGrid(d),
      styles: {
        halign: "center" as const,
        fontSize: TIMESHEET_PDF_DAY_NUM_FONT_SIZE,
        valign: "middle" as const,
        fontStyle: "bold" as const,
      },
    })),
    {
      content: "Tot.",
      styles: { halign: "center" as const, fontSize: 6.5, fontStyle: "bold" as const, valign: "middle" as const },
    },
  ];
  const colCount = headRow.length;
  const totColIndex = colCount - 1;

  const styles: Record<
    number,
    {
      cellWidth: number;
      halign: "left" | "center";
      overflow: "hidden" | "linebreak";
      fontSize: number;
      valign?: "top" | "middle" | "bottom";
      cellPadding?: typeof TIMESHEET_PDF_DAY_CELL_PAD;
      minCellHeight?: number;
    }
  > = {
    0: {
      cellWidth: nameColW,
      halign: "left",
      overflow: "linebreak",
      fontSize: TIMESHEET_PDF_BODY_FONT_SIZE,
      valign: "middle",
      minCellHeight: TIMESHEET_PDF_MIN_CELL_HEIGHT_MM,
    },
  };
  for (let i = 1; i < totColIndex; i++) {
    styles[i] = {
      cellWidth: dayColWidths[i - 1]!,
      halign: "center",
      overflow: "hidden",
      fontSize: TIMESHEET_PDF_BODY_FONT_SIZE,
      valign: "middle",
      cellPadding: TIMESHEET_PDF_DAY_CELL_PAD,
      minCellHeight: TIMESHEET_PDF_MIN_CELL_HEIGHT_MM,
    };
  }
  styles[totColIndex] = {
    cellWidth: totColW,
    halign: "center",
    overflow: "hidden",
    fontSize: TIMESHEET_PDF_BODY_FONT_SIZE,
    valign: "middle",
    cellPadding: TIMESHEET_PDF_DAY_CELL_PAD,
    minCellHeight: TIMESHEET_PDF_MIN_CELL_HEIGHT_MM,
  };

  const body: RowInput[] = [];

  for (const emp of employees) {
    const empEntries = entriesForEmployee(emp.id, ctx.entries);
    const totals = computeMonthTotals(empEntries);
    const name = employeeDisplayName(emp, ctx.entries);

    const workCells = days.map((d) => {
      const cell = cellForDay(empEntries, d.dateYmd);
      return formatWorkCellShortLabel(cell) || "·";
    });
    const absenceCells = days.map((d) => {
      const cell = cellForDay(empEntries, d.dateYmd);
      return formatAbsenceCellShortLabel(cell, ctx.tipiAssenza) || "·";
    });

    body.push([
      {
        content: formatEmployeeNamePdfLines(name),
        rowSpan: 2,
        styles: {
          halign: "left",
          valign: "middle",
          fontSize: TIMESHEET_PDF_BODY_FONT_SIZE,
          overflow: "linebreak",
        },
      },
      ...workCells.map((c) => pdfGridBodyCell(c)),
      pdfGridBodyCell(fmtOre(totals.totaleLavorato)),
    ]);
    body.push([
      ...absenceCells.map((c) => pdfMutedAbsenceLabelCell(c)),
      pdfMutedTotalCell(fmtOre(totals.oreAssenza)),
    ]);
  }

  if (showFooterTotals) {
    const dailyWorkTotals = days.map((d) => {
      let oreOrdinarie = 0;
      let oreStraordinarie = 0;
      for (const emp of employees) {
        const cell = cellForDay(entriesForEmployee(emp.id, ctx.entries), d.dateYmd);
        oreOrdinarie += cell.oreOrdinarie;
        oreStraordinarie += cell.oreStraordinarie;
      }
      return roundOreSum(oreOrdinarie + oreStraordinarie);
    });

    const dailyAbsenceTotals = days.map((d) => {
      let oreAssenza = 0;
      for (const emp of employees) {
        const cell = cellForDay(entriesForEmployee(emp.id, ctx.entries), d.dateYmd);
        oreAssenza += cell.oreAssenza;
      }
      return roundOreSum(oreAssenza);
    });

    const globalTotals = computeMonthTotals(
      employees.flatMap((emp) => entriesForEmployee(emp.id, ctx.entries)),
    );

    body.push([
      {
        content: "Totali",
        rowSpan: 2,
        styles: {
          halign: "left",
          valign: "middle",
          fontSize: TIMESHEET_PDF_BODY_FONT_SIZE,
          fontStyle: "bold",
        },
      },
      ...dailyWorkTotals.map((t) => pdfGridBodyCell(fmtOre(t))),
      pdfGridBodyCell(fmtOre(globalTotals.totaleLavorato)),
    ]);
    body.push([
      ...dailyAbsenceTotals.map((t) => pdfMutedTotalCell(fmtOre(t))),
      pdfMutedTotalCell(fmtOre(globalTotals.oreAssenza)),
    ]);
  }

  return drawGestionaleDataSectionTable(
    doc,
    startY,
    pageW,
    sectionTitle,
    headRow,
    body,
    styles,
    undefined,
    tableLayout,
  );
}
