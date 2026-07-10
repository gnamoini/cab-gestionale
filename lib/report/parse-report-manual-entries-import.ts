import { cellString, findHeaderRow, parseNumberCell } from "@/lib/data-import/core/parse-spreadsheet";
import { isPastReportMonth } from "@/lib/report/report-manual-entries-map";

export type ReportManualEntryImportRow = {
  periodMonth: string;
  completedCount: number;
  note: string | null;
  sourceRow: number;
};

export type ReportManualEntryImportParseResult = {
  rows: ReportManualEntryImportRow[];
  errors: { row: number; message: string }[];
  warnings: string[];
};

const PERIOD_ALIASES = ["periodo", "mese", "period", "period_month", "periodo (yyyy-mm)", "periodo yyyy-mm"];
const COUNT_ALIASES = [
  "lavorazioni completate",
  "completate",
  "lavorazioni",
  "numero",
  "count",
  "quantita",
  "qty",
];
const NOTE_ALIASES = ["note", "nota", "notes", "annotazioni"];

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function findColumnIndex(headers: string[], aliases: readonly string[]): number {
  const norm = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const exact = norm.indexOf(alias);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    const partial = norm.findIndex((h) => h.includes(alias) || alias.includes(h));
    if (partial >= 0) return partial;
  }
  return -1;
}

/** Excel serial (1900) → `YYYY-MM-01` locale. */
function periodFromExcelSerial(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1) return null;
  const utc = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (Number.isNaN(utc.getTime())) return null;
  const y = utc.getUTCFullYear();
  const m = utc.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

export function parsePeriodMonthCell(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") {
    if (raw >= 190_001 && raw < 300_000) {
      const s = String(Math.trunc(raw));
      const y = Number(s.slice(0, 4));
      const m = Number(s.slice(4, 6));
      if (m >= 1 && m <= 12) return `${y}-${String(m).padStart(2, "0")}-01`;
    }
    return periodFromExcelSerial(raw);
  }
  const t = String(raw).trim();
  if (/^\d{4}-\d{2}$/.test(t)) return `${t}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t.slice(0, 7)}-01`;
  if (/^\d{1,2}\/\d{4}$/.test(t)) {
    const [mo, y] = t.split("/");
    const m = Number(mo);
    const year = Number(y);
    if (m >= 1 && m <= 12 && year >= 1900) return `${year}-${String(m).padStart(2, "0")}-01`;
  }
  const d = new Date(`${t.slice(0, 10)}T12:00:00`);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }
  return null;
}

export function parseReportManualEntriesMatrix(
  matrix: unknown[][],
  anchor: Date = new Date(),
): ReportManualEntryImportParseResult {
  const errors: { row: number; message: string }[] = [];
  const warnings: string[] = [];
  const rows: ReportManualEntryImportRow[] = [];

  if (!matrix.length) {
    return { rows, errors: [{ row: 0, message: "Il file non contiene righe." }], warnings };
  }

  const headerIdx = findHeaderRow(matrix);
  const headers = (matrix[headerIdx] ?? []).map((c) => cellString(c));
  const periodCol = findColumnIndex(headers, PERIOD_ALIASES);
  const countCol = findColumnIndex(headers, COUNT_ALIASES);
  const noteCol = findColumnIndex(headers, NOTE_ALIASES);

  if (periodCol < 0 || countCol < 0) {
    return {
      rows,
      errors: [
        {
          row: headerIdx + 1,
          message:
            "Intestazioni mancanti. Servono almeno le colonne «Periodo» (YYYY-MM) e «Lavorazioni completate».",
        },
      ],
      warnings,
    };
  }

  const seenPeriods = new Set<string>();

  for (let r = headerIdx + 1; r < matrix.length; r += 1) {
    const row = matrix[r] ?? [];
    const periodRaw = row[periodCol];
    const countRaw = row[countCol];
    const periodCell = cellString(periodRaw);
    const countCell = cellString(countRaw);
    const noteCell = noteCol >= 0 ? cellString(row[noteCol]) : "";

    if (!periodCell && !countCell) continue;

    const rowNum = r + 1;
    const periodMonth = parsePeriodMonthCell(periodRaw);
    if (!periodMonth) {
      errors.push({ row: rowNum, message: `Periodo non valido: «${periodCell || "vuoto"}». Usa YYYY-MM.` });
      continue;
    }
    if (!isPastReportMonth(periodMonth, anchor)) {
      errors.push({ row: rowNum, message: `Il periodo ${periodMonth.slice(0, 7)} non è un mese passato.` });
      continue;
    }

    const count = parseNumberCell(countRaw);
    if (count == null || count < 0 || !Number.isInteger(count)) {
      errors.push({
        row: rowNum,
        message: `Numero lavorazioni completate non valido: «${countCell || "vuoto"}».`,
      });
      continue;
    }

    const periodKey = periodMonth.slice(0, 7);
    if (seenPeriods.has(periodKey)) {
      warnings.push(`Riga ${rowNum}: periodo ${periodKey} duplicato nel file; verrà usata l'ultima occorrenza.`);
    }
    seenPeriods.add(periodKey);

    const existingIdx = rows.findIndex((x) => x.periodMonth.slice(0, 7) === periodKey);
    const parsed: ReportManualEntryImportRow = {
      periodMonth,
      completedCount: Math.round(count),
      note: noteCell || null,
      sourceRow: rowNum,
    };
    if (existingIdx >= 0) {
      rows[existingIdx] = parsed;
    } else {
      rows.push(parsed);
    }
  }

  if (!rows.length && !errors.length) {
    errors.push({ row: 0, message: "Nessuna riga dati valida nel file." });
  }

  return { rows, errors, warnings };
}
