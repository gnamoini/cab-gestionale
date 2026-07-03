import type { WorkBook, WorkSheet } from "@e965/xlsx";

/** ponytail: sync parse in-process; upgrade path = worker thread if uploads grow. */
export const SPREADSHEET_MAX_BYTES = 5 * 1024 * 1024;
export const SPREADSHEET_PARSE_TIMEOUT_MS = 5_000;

const XLSX_MIME =
  /^(application\/vnd\.(openxmlformats-officedocument\.spreadsheetml\.sheet|ms-excel)|application\/octet-stream)$/i;

export function assertSpreadsheetUploadAllowed(bytes: Uint8Array, fileName: string, mimeType?: string): void {
  if (bytes.byteLength > SPREADSHEET_MAX_BYTES) {
    throw new Error(`File troppo grande (max ${SPREADSHEET_MAX_BYTES / (1024 * 1024)}MB).`);
  }
  const lower = fileName.toLowerCase();
  if (!/\.(xlsx|xls|csv)$/i.test(lower)) {
    throw new Error("Formato file non supportato. Usa .xlsx, .xls o .csv.");
  }
  if (mimeType?.trim() && !/\.csv$/i.test(lower) && !XLSX_MIME.test(mimeType.trim())) {
    throw new Error("MIME type non valido per import spreadsheet.");
  }
}

function loadXlsxModule(): typeof import("@e965/xlsx") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@e965/xlsx") as typeof import("@e965/xlsx");
}

function runWithTimeout<T>(fn: () => T, timeoutMs: number): T {
  const start = Date.now();
  const result = fn();
  if (Date.now() - start > timeoutMs) {
    throw new Error("Timeout parsing spreadsheet.");
  }
  return result;
}

export function readSpreadsheetWorkbook(bytes: Uint8Array, fileName: string, mimeType?: string): WorkBook {
  assertSpreadsheetUploadAllowed(bytes, fileName, mimeType);
  const xlsx = loadXlsxModule();
  return runWithTimeout(
    () => xlsx.read(Buffer.from(bytes), { type: "buffer", cellDates: false }),
    SPREADSHEET_PARSE_TIMEOUT_MS,
  );
}

export function sheetToMatrix(sheet: WorkSheet): unknown[][] {
  const xlsx = loadXlsxModule();
  return xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
}

export function getXlsxUtils() {
  return loadXlsxModule().utils;
}

export function writeSpreadsheetWorkbook(
  build: (utils: typeof import("@e965/xlsx").utils) => WorkBook,
): Buffer {
  const xlsx = loadXlsxModule();
  const wb = build(xlsx.utils);
  return xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
