import "server-only";

import { CLIENTI_IMPORT_FIELDS } from "@/lib/data-import/entities/clienti/clienti-import-schema";
import { writeSpreadsheetWorkbook } from "@/lib/spreadsheet/xlsx-server";

export function generateClientiImportTemplateXlsx(): Buffer {
  const headers = CLIENTI_IMPORT_FIELDS.map((f) => f.label);
  const examples = CLIENTI_IMPORT_FIELDS.map((f) => f.example ?? "");
  return writeSpreadsheetWorkbook((utils) => {
    const wsData = utils.aoa_to_sheet([headers, examples]);
    const wsLegend = utils.aoa_to_sheet([
      ["Campo", "Descrizione", "Obbligatorio"],
      ...CLIENTI_IMPORT_FIELDS.map((f) => [f.label, f.description ?? "", f.required ? "Sì" : "No"]),
    ]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, wsData, "Clienti");
    utils.book_append_sheet(wb, wsLegend, "Legenda");
    return wb;
  });
}

export const CLIENTI_TEMPLATE_FILENAME = "template-import-clienti.xlsx";
