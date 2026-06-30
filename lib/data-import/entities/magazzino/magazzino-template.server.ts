import "server-only";

import { MAGAZZINO_IMPORT_FIELDS } from "@/lib/data-import/entities/magazzino/magazzino-import-schema";

export function generateMagazzinoImportTemplateXlsx(): Buffer {
  const xlsx = require("xlsx") as typeof import("xlsx");
  const headers = MAGAZZINO_IMPORT_FIELDS.map((f) => f.label);
  const examples = MAGAZZINO_IMPORT_FIELDS.map((f) => f.example ?? "");
  const legend = MAGAZZINO_IMPORT_FIELDS.map((f) => `${f.label}${f.required ? " *" : ""}: ${f.description ?? ""}`);

  const wsData = xlsx.utils.aoa_to_sheet([headers, examples]);
  const wsLegend = xlsx.utils.aoa_to_sheet([["Campo", "Descrizione"], ...MAGAZZINO_IMPORT_FIELDS.map((f) => [f.label, f.description ?? ""])]);

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, wsData, "Magazzino");
  xlsx.utils.book_append_sheet(wb, wsLegend, "Legenda");
  return xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export const MAGAZZINO_TEMPLATE_FILENAME = "template-import-magazzino.xlsx";
