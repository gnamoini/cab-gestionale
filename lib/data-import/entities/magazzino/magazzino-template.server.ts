import "server-only";

import { MAGAZZINO_IMPORT_FIELDS } from "@/lib/data-import/entities/magazzino/magazzino-import-schema";
import { writeSpreadsheetWorkbook } from "@/lib/spreadsheet/xlsx-server";

export function generateMagazzinoImportTemplateXlsx(): Buffer {
  const headers = MAGAZZINO_IMPORT_FIELDS.map((f) => f.label);
  const examples = MAGAZZINO_IMPORT_FIELDS.map((f) => f.example ?? "");
  return writeSpreadsheetWorkbook((utils) => {
    const wsData = utils.aoa_to_sheet([headers, examples]);
    const wsLegend = utils.aoa_to_sheet([
      ["Campo", "Descrizione"],
      ...MAGAZZINO_IMPORT_FIELDS.map((f) => [f.label, f.description ?? ""]),
    ]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, wsData, "Magazzino");
    utils.book_append_sheet(wb, wsLegend, "Legenda");
    return wb;
  });
}

export const MAGAZZINO_TEMPLATE_FILENAME = "template-import-magazzino.xlsx";
