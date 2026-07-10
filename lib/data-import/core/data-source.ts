import type { NormalizedDataset } from "@/lib/data-import/core/normalized-dataset";
import type { ImportEntity } from "@/lib/data-import/core/types";

export type DataSourceKind =
  | "spreadsheet"
  | "csv"
  | "json"
  | "xml"
  | "ai_extraction"
  | "api_bulk"
  | "google_sheets";

export type DataSourceInput = {
  entity: ImportEntity;
  fileName: string;
  fileBase64: string;
  sheetIndex?: number;
};

export interface DataSourceAdapter {
  kind: DataSourceKind;
  supportedExtensions: string[];
  parse(input: DataSourceInput): Promise<NormalizedDataset>;
}

export const ALL_DATA_SOURCE_KINDS: DataSourceKind[] = [
  "spreadsheet",
  "csv",
  "json",
  "xml",
  "ai_extraction",
  "api_bulk",
  "google_sheets",
];

export function extensionToDataSourceKind(fileName: string): DataSourceKind | null {
  const lower = fileName.trim().toLowerCase();
  if (/\.(xlsx|xls)$/i.test(lower)) return "spreadsheet";
  if (/\.csv$/i.test(lower)) return "csv";
  if (/\.json$/i.test(lower)) return "json";
  if (/\.xml$/i.test(lower)) return "xml";
  if (/\.pdf$/i.test(lower)) return "ai_extraction";
  return null;
}
