import "server-only";

import { autoDetectColumnMapping } from "@/lib/data-import/core/column-mapper";
import { parseSpreadsheetBuffer, cellString } from "@/lib/data-import/core/parse-spreadsheet";
import { decodeImportFileBase64 } from "@/lib/data-import/core/decode-import-file.server";
import type { DataSourceAdapter, DataSourceInput } from "@/lib/data-import/core/data-source";
import type { NormalizedDataset, NormalizedRow } from "@/lib/data-import/core/normalized-dataset";
import { parseRowSkipFromRecord } from "@/lib/data-import/core/row-skip-column";
import { ImportExportRegistry } from "@/lib/data-import/registry/import-export-registry";
import { assessImportCompatibility } from "@/lib/data-import/core/template-compatibility";
import { computeSchemaHash } from "@/lib/data-import/core/template-compatibility";

function matrixToNormalizedDataset(
  input: DataSourceInput,
  matrix: unknown[][],
  mapping: { headerRowIndex: number; dataStartRowIndex: number; columns: { sourceColumn: number; targetField: string }[] },
): NormalizedRow[] {
  const rows: NormalizedRow[] = [];
  for (let i = mapping.dataStartRowIndex; i < matrix.length; i++) {
    const line = matrix[i];
    if (!Array.isArray(line)) continue;
    const cells: NormalizedRow["cells"] = {};
    const rawRecord: Record<string, unknown> = {};
    for (const col of mapping.columns) {
      const raw = line[col.sourceColumn];
      const parsed = raw == null || String(raw).trim() === "" ? null : cellString(raw);
      cells[col.targetField] = { raw, parsed, issues: [] };
      rawRecord[col.targetField] = parsed;
    }
    rows.push({
      rowIndex: i + 1,
      cells,
      skip: parseRowSkipFromRecord(rawRecord),
    });
  }
  return rows;
}

export const spreadsheetDataSourceAdapter: DataSourceAdapter = {
  kind: "spreadsheet",
  supportedExtensions: [".xlsx", ".xls", ".csv"],

  async parse(input: DataSourceInput): Promise<NormalizedDataset> {
    const def = ImportExportRegistry.getDefinition(input.entity);
    const legacy = ImportExportRegistry.getLegacyPlugin(input.entity);
    const bytes = decodeImportFileBase64(input.fileBase64);
    const parsed = parseSpreadsheetBuffer(bytes, input.fileName, input.sheetIndex ?? 0);
    const suggested = autoDetectColumnMapping(
      parsed.matrix,
      legacy.fields,
      legacy.patterns,
      0,
    );
    const rows = matrixToNormalizedDataset(input, parsed.matrix, {
      headerRowIndex: suggested.headerRowIndex,
      dataStartRowIndex: suggested.dataStartRowIndex,
      columns: suggested.columns,
    });
    const detectedKeys = suggested.columns.map((c) => c.targetField);
    const compat = assessImportCompatibility({
      fileMeta: { entity: input.entity },
      pluginTemplateVersion: def.templateVersion,
      pluginEntity: input.entity,
      requiredFieldKeys: def.fields.filter((f) => f.required).map((f) => f.key),
      detectedColumnKeys: detectedKeys,
      currentSchemaHash: computeSchemaHash(def.fields, "importable"),
    });
    return {
      entity: input.entity,
      pluginVersion: def.pluginVersion,
      templateVersion: def.templateVersion,
      schemaHash: computeSchemaHash(def.fields, "importable"),
      source: "spreadsheet",
      sheets: [
        {
          name: def.templateSheetName ?? "Dati",
          role: "parent",
          columns: def.fields.map((f, index) => ({ key: f.key, label: f.label, index })),
          rows,
        },
      ],
      metadata: {
        fileName: input.fileName,
        compatibility: compat,
        warnings: parsed.warnings,
      },
    };
  },
};
