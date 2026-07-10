import "server-only";

import { readSpreadsheetWorkbook, sheetToMatrix } from "@/lib/spreadsheet/xlsx-server";
import type { WorkbookMeta } from "@/lib/data-import/core/backup-import-policy";

export {
  assertBackupImportAllowed,
  BACKUP_NOT_IMPORTABLE,
  computeManifestHash,
  ImportValidationError,
  manifestHashWarnings,
} from "@/lib/data-import/core/backup-import-policy";
export type { WorkbookMeta } from "@/lib/data-import/core/backup-import-policy";

function parseMetaSheet(matrix: unknown[][]): WorkbookMeta {
  const out: WorkbookMeta = {};
  for (let i = 1; i < matrix.length; i++) {
    const key = String(matrix[i]?.[0] ?? "").trim();
    const val = String(matrix[i]?.[1] ?? "").trim();
    if (!key) continue;
    if (key === "ExportMode") out.exportMode = val as WorkbookMeta["exportMode"];
    if (key === "TemplateVersion") out.templateVersion = val;
    if (key === "SchemaHash") out.schemaHash = val;
    if (key === "ManifestHash") out.manifestHash = val;
    if (key === "Entity") out.entity = val;
  }
  return out;
}

export function extractWorkbookMeta(bytes: Uint8Array, fileName: string): WorkbookMeta {
  const lower = fileName.toLowerCase();
  if (/\.csv$/i.test(lower)) return {};
  try {
    const wb = readSpreadsheetWorkbook(bytes, fileName);
    const metaName = wb.SheetNames.find((n) => n === "_meta" || n.toLowerCase() === "_meta");
    if (!metaName) return {};
    return parseMetaSheet(sheetToMatrix(wb.Sheets[metaName]!));
  } catch {
    return {};
  }
}
