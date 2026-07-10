export const ROW_SKIP_COLUMN_KEYS = new Set(["importa", "Importa", "skip", "Skip"]);

export function isRowSkipped(importaValue: unknown): boolean {
  if (importaValue == null) return false;
  const s = String(importaValue).trim().toLowerCase();
  if (!s) return false;
  return s === "no" || s === "n" || s === "skip" || s === "0" || s === "false";
}

export function parseRowSkipFromRecord(record: Record<string, unknown>): boolean {
  for (const key of ROW_SKIP_COLUMN_KEYS) {
    if (key in record && isRowSkipped(record[key])) return true;
  }
  return false;
}
