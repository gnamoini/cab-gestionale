import { applyListinoColumnMap, detectListinoColumnMap } from "@/lib/magazzino/listino-import/parse-listino-column-map";
import type { ListinoImportRawRow } from "@/lib/magazzino/listino-import/listino-import-types";

function sheetToMatrix(sheet: import("xlsx").WorkSheet): unknown[][] {
  const xlsx = require("xlsx") as typeof import("xlsx");
  return xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
}

function parseCsvText(text: string): unknown[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const sep = line.includes(";") && !line.includes(",") ? ";" : ",";
    return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  });
}

/** Excel/CSV → righe normalizzate (deterministico). */
export function parseListinoSpreadsheetBuffer(
  bytes: Uint8Array,
  fileName: string,
): { rows: ListinoImportRawRow[]; warnings: string[]; needsAiColumnMap: boolean } {
  const lower = fileName.toLowerCase();
  const warnings: string[] = [];
  let matrix: unknown[][] = [];

  if (/\.csv$/i.test(lower)) {
    const text = new TextDecoder("utf-8").decode(bytes);
    matrix = parseCsvText(text);
  } else {
    const xlsx = require("xlsx") as typeof import("xlsx");
    const wb = xlsx.read(Buffer.from(bytes), { type: "buffer", cellDates: false });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { rows: [], warnings: ["Foglio Excel vuoto."], needsAiColumnMap: false };
    matrix = sheetToMatrix(wb.Sheets[sheetName]!);
  }

  if (!matrix.length) return { rows: [], warnings: ["Nessun dato tabellare nel file."], needsAiColumnMap: false };

  const map = detectListinoColumnMap(matrix);
  if (!map.confident) {
    return { rows: [], warnings: ["Intestazioni colonne non riconosciute."], needsAiColumnMap: true };
  }

  const parsed = applyListinoColumnMap(matrix, map);
  if (!parsed.length) warnings.push("Nessuna riga valida dopo il mapping colonne.");

  return {
    rows: parsed,
    warnings,
    needsAiColumnMap: false,
  };
}

/** Sample per Gemini column mapping (header + prime righe). */
export function buildSpreadsheetSampleForAi(matrix: unknown[][], maxRows = 8): string {
  const headerRowIndex = detectListinoColumnMap(matrix).headerRowIndex;
  const slice = matrix.slice(headerRowIndex, headerRowIndex + maxRows);
  return JSON.stringify(slice);
}

export function readSpreadsheetMatrix(bytes: Uint8Array, fileName: string): unknown[][] {
  const lower = fileName.toLowerCase();
  if (/\.csv$/i.test(lower)) {
    const text = new TextDecoder("utf-8").decode(bytes);
    return parseCsvText(text);
  }
  const xlsx = require("xlsx") as typeof import("xlsx");
  const wb = xlsx.read(Buffer.from(bytes), { type: "buffer", cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  return sheetToMatrix(wb.Sheets[sheetName]!);
}
