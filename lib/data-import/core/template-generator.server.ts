import "server-only";

import type { ImportFieldDef } from "@/lib/data-import/core/types";
import { writeSpreadsheetWorkbook } from "@/lib/spreadsheet/xlsx-server";

export type TemplateGeneratorOptions = {
  sheetName?: string;
  legendSheetName?: string;
  includeLegend?: boolean;
};

export function generateImportTemplateXlsx(
  fields: ImportFieldDef[],
  options: TemplateGeneratorOptions = {},
): Buffer {
  const sheetName = options.sheetName ?? "Import";
  const headers = fields.map((f) => f.label);
  const examples = fields.map((f) => f.example ?? "");

  return writeSpreadsheetWorkbook((utils) => {
    const wsData = utils.aoa_to_sheet([headers, examples]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, wsData, sheetName);

    if (options.includeLegend !== false) {
      const wsLegend = utils.aoa_to_sheet([
        ["Campo", "Descrizione"],
        ...fields.map((f) => [`${f.label}${f.required ? " *" : ""}`, f.description ?? ""]),
      ]);
      utils.book_append_sheet(wb, wsLegend, options.legendSheetName ?? "Legenda");
    }

    return wb;
  });
}

export function generateImportTemplateCsv(fields: ImportFieldDef[]): Buffer {
  const headers = fields.map((f) => f.label);
  const examples = fields.map((f) => f.example ?? "");
  const escape = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const lines = [headers.map(escape).join(","), examples.map(escape).join(",")];
  return Buffer.from(lines.join("\n"), "utf-8");
}
