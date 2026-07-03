import type { ImportParseResult, ImportParseSheetInfo } from "@/lib/data-import/core/types";
import {
  readSpreadsheetWorkbook,
  sheetToMatrix,
} from "@/lib/spreadsheet/xlsx-server";

function normalizeCell(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function parseCsvText(text: string): unknown[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const sep = line.includes(";") && !line.includes(",") ? ";" : ",";
    return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  });
}

function analyzeMatrix(matrix: unknown[][]): { rowCount: number; columnCount: number } {
  let columnCount = 0;
  for (const row of matrix) {
    columnCount = Math.max(columnCount, row?.length ?? 0);
  }
  return { rowCount: matrix.length, columnCount };
}

export function parseSpreadsheetBuffer(
  bytes: Uint8Array,
  fileName: string,
  sheetIndex = 0,
): ImportParseResult {
  const lower = fileName.toLowerCase();
  const warnings: string[] = [];
  let sheets: ImportParseSheetInfo[] = [];
  let matrix: unknown[][] = [];

  if (/\.csv$/i.test(lower)) {
    const text = new TextDecoder("utf-8").decode(bytes);
    matrix = parseCsvText(text);
    const { rowCount, columnCount } = analyzeMatrix(matrix);
    sheets = [{ index: 0, name: "CSV", rowCount, columnCount }];
  } else {
    const wb = readSpreadsheetWorkbook(bytes, fileName);
    sheets = wb.SheetNames.map((name, index) => {
      const m = sheetToMatrix(wb.Sheets[name]!);
      const { rowCount, columnCount } = analyzeMatrix(m);
      return { index, name, rowCount, columnCount };
    });
    const idx = Math.min(Math.max(0, sheetIndex), Math.max(0, wb.SheetNames.length - 1));
    const sheetName = wb.SheetNames[idx];
    if (!sheetName) {
      warnings.push("Foglio Excel vuoto.");
      matrix = [];
    } else {
      matrix = sheetToMatrix(wb.Sheets[sheetName]!);
    }
  }

  if (!matrix.length) warnings.push("Nessun dato tabellare nel file.");

  return { sheets, matrix, warnings, fileName };
}

export function extractHeaders(matrix: unknown[][], headerRowIndex: number): string[] {
  return (matrix[headerRowIndex] ?? []).map(normalizeCell);
}

export function findHeaderRow(matrix: unknown[][]): number {
  for (let r = 0; r < Math.min(matrix.length, 25); r += 1) {
    const row = matrix[r] ?? [];
    const nonEmpty = row.filter((c) => normalizeCell(c).length > 0).length;
    if (nonEmpty >= 2) return r;
  }
  return 0;
}

export function parseNumberCell(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw ?? "")
    .trim()
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function cellString(raw: unknown): string {
  return normalizeCell(raw);
}
