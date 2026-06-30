import { parseNumberCell } from "@/lib/data-import/core/parse-spreadsheet";
import { applyColumnMapping } from "@/lib/data-import/core/column-mapper";
import type { ImportMappingConfig } from "@/lib/data-import/core/types";
import type { MagazzinoImportRow } from "@/lib/data-import/entities/magazzino/magazzino-import-schema";
import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";

export function mapMatrixToMagazzinoRows(
  matrix: unknown[][],
  mapping: ImportMappingConfig,
): MagazzinoImportRow[] {
  const mapped = applyColumnMapping(matrix, mapping);
  const rows: MagazzinoImportRow[] = [];
  for (const { rowIndex, values } of mapped) {
    const codice = normalizeRicambioCodice(String(values.codice ?? ""));
    const descrizione = String(values.descrizione ?? "").trim();
    if (!codice && !descrizione) continue;
    rows.push({
      rowIndex,
      codice,
      descrizione: descrizione || "Senza descrizione",
      marca: String(values.marca ?? "").trim() || undefined,
      quantita: parseNumberCell(values.quantita) ?? undefined,
      costo: parseNumberCell(values.costo) ?? undefined,
      prezzo_vendita: parseNumberCell(values.prezzo_vendita) ?? undefined,
      categoria: String(values.categoria ?? "").trim() || undefined,
      note: String(values.note ?? "").trim() || undefined,
      unita_misura: String(values.unita_misura ?? "").trim() || undefined,
      scorta_minima: parseNumberCell(values.scorta_minima) ?? undefined,
      sconto_percent: parseNumberCell(values.sconto_percent) ?? undefined,
    });
  }
  return rows;
}
