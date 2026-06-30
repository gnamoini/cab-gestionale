import "server-only";

import { CLIENTI_IMPORT_FIELDS } from "@/lib/data-import/entities/clienti/clienti-import-schema";

export function generateClientiImportTemplateXlsx(): Buffer {
  const xlsx = require("xlsx") as typeof import("xlsx");
  const headers = CLIENTI_IMPORT_FIELDS.map((f) => f.label);
  const examples = CLIENTI_IMPORT_FIELDS.map((f) => f.example ?? "");
  const wsData = xlsx.utils.aoa_to_sheet([headers, examples]);
  const wsLegend = xlsx.utils.aoa_to_sheet([
    ["Campo", "Descrizione", "Obbligatorio"],
    ...CLIENTI_IMPORT_FIELDS.map((f) => [f.label, f.description ?? "", f.required ? "Sì" : "No"]),
  ]);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, wsData, "Clienti");
  xlsx.utils.book_append_sheet(wb, wsLegend, "Legenda");
  return xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export const CLIENTI_TEMPLATE_FILENAME = "template-import-clienti.xlsx";
