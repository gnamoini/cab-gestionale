import { cellString, findHeaderRow } from "@/lib/data-import/core/parse-spreadsheet";
import type { ImportColumnMapping, ImportFieldDef, ImportMappingConfig } from "@/lib/data-import/core/types";

export type FieldPatternSet = Record<string, RegExp[]>;

function matchColumn(headers: string[], patterns: RegExp[]): number | null {
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i];
    if (!h) continue;
    if (patterns.some((p) => p.test(h))) return i;
  }
  return null;
}

export function autoDetectColumnMapping(
  matrix: unknown[][],
  fieldCatalog: ImportFieldDef[],
  patterns: FieldPatternSet,
  headerRowIndex?: number,
): ImportMappingConfig {
  const headerIdx = headerRowIndex ?? findHeaderRow(matrix);
  const headers = (matrix[headerIdx] ?? []).map((c) => cellString(c));
  const columns: ImportColumnMapping[] = [];
  const used = new Set<number>();

  for (const field of fieldCatalog) {
    const pats = patterns[field.key];
    if (!pats?.length) continue;
    const col = matchColumn(headers, pats);
    if (col != null && !used.has(col)) {
      columns.push({ sourceColumn: col, targetField: field.key });
      used.add(col);
    }
  }

  return {
    headerRowIndex: headerIdx,
    dataStartRowIndex: headerIdx + 1,
    sheetIndex: 0,
    columns,
  };
}

export function applyColumnMapping(
  matrix: unknown[][],
  mapping: ImportMappingConfig,
): Array<{ rowIndex: number; values: Record<string, string | number | null> }> {
  const rows: Array<{ rowIndex: number; values: Record<string, string | number | null> }> = [];
  for (let r = mapping.dataStartRowIndex; r < matrix.length; r += 1) {
    const row = matrix[r] ?? [];
    const values: Record<string, string | number | null> = {};
    let hasData = false;
    for (const col of mapping.columns) {
      const raw = row[col.sourceColumn];
      const str = cellString(raw);
      if (str) hasData = true;
      values[col.targetField] = str || null;
    }
    if (!hasData) continue;
    rows.push({ rowIndex: r + 1, values });
  }
  return rows;
}
