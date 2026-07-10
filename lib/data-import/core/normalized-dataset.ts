import type { ImportEntity } from "@/lib/data-import/core/types";
import type { DataSourceKind } from "@/lib/data-import/core/data-source";
import type { ValidationIssue } from "@/lib/data-import/core/field-schema";

export type NormalizedSheetRole = "parent" | "child" | "lookup" | "meta";

export type NormalizedColumn = {
  key: string;
  label: string;
  index: number;
};

export type NormalizedCell = {
  raw: unknown;
  parsed: unknown;
  issues: ValidationIssue[];
};

export type NormalizedRow = {
  rowIndex: number;
  cells: Record<string, NormalizedCell>;
  skip?: boolean;
};

export type NormalizedSheet = {
  name: string;
  role: NormalizedSheetRole;
  columns: NormalizedColumn[];
  rows: NormalizedRow[];
  parentSheetName?: string;
  fkField?: string;
};

export type NormalizedDataset = {
  entity: ImportEntity;
  pluginVersion: string;
  templateVersion: string;
  schemaHash: string;
  source: DataSourceKind;
  exportMode?: "template" | "importable" | "backup";
  sheets: NormalizedSheet[];
  metadata: Record<string, unknown>;
};

export const MAX_RELATIONAL_DEPTH = 2;

export function assertRelationalDepth(sheets: NormalizedSheet[]): void {
  const childCount = sheets.filter((s) => s.role === "child").length;
  if (childCount > 1 && sheets.some((s) => s.parentSheetName && sheets.some(
    (p) => p.name === s.parentSheetName && p.role === "child",
  ))) {
    throw new Error("Relazioni annidate oltre 2 livelli non supportate.");
  }
}

export function getParentSheet(dataset: NormalizedDataset): NormalizedSheet | undefined {
  return dataset.sheets.find((s) => s.role === "parent") ?? dataset.sheets.find((s) => s.role !== "lookup" && s.role !== "meta");
}

export function rowCellString(row: NormalizedRow, key: string): string {
  const cell = row.cells[key];
  if (!cell) return "";
  const v = cell.parsed ?? cell.raw;
  if (v == null) return "";
  return String(v).trim();
}
