import { applyColumnMapping } from "@/lib/data-import/core/column-mapper";
import { parseNumberCell } from "@/lib/data-import/core/parse-spreadsheet";
import type { ImportMappingConfig } from "@/lib/data-import/core/types";
import type { ClientiImportRow } from "@/lib/data-import/entities/clienti/clienti-import-schema";

export function mapMatrixToClientiRows(matrix: unknown[][], mapping: ImportMappingConfig): ClientiImportRow[] {
  const mapped = applyColumnMapping(matrix, mapping);
  const rows: ClientiImportRow[] = [];
  for (const { rowIndex, values } of mapped) {
    const nomeDisplay = String(values.nome_display ?? values.ragione_sociale ?? "").trim();
    if (!nomeDisplay) continue;
    rows.push({
      rowIndex,
      nomeDisplay,
      ragioneSociale: String(values.ragione_sociale ?? "").trim() || undefined,
      partitaIva: String(values.partita_iva ?? "").replace(/\D/g, "") || undefined,
      codiceFiscale: String(values.codice_fiscale ?? "").trim().toUpperCase() || undefined,
      codiceDestinatario: String(values.codice_destinatario ?? "").trim().toUpperCase() || undefined,
      pec: String(values.pec ?? "").trim() || undefined,
      email: String(values.email ?? "").trim() || undefined,
      telefono: String(values.telefono ?? "").trim() || undefined,
      note: String(values.note ?? "").trim() || undefined,
      sedeLegale: {
        via: String(values.sede_legale_via ?? "").trim() || undefined,
        civico: String(values.sede_legale_civico ?? "").trim() || undefined,
        cap: String(values.sede_legale_cap ?? "").trim() || undefined,
        citta: String(values.sede_legale_citta ?? "").trim() || undefined,
        provincia: String(values.sede_legale_provincia ?? "").trim().toUpperCase() || undefined,
      },
      sedeOperativa: {
        via: String(values.sede_operativa_via ?? "").trim() || undefined,
        cap: String(values.sede_operativa_cap ?? "").trim() || undefined,
        citta: String(values.sede_operativa_citta ?? "").trim() || undefined,
      },
      scontoRicambi: parseNumberCell(values.sconto_ricambi) ?? undefined,
    });
  }
  return rows;
}
