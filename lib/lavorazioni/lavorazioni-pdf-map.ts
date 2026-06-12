import { formatIdentificazionePdfCell } from "@/lib/lavorazioni/lavorazioni-pdf-format";
import type { LavorazioniInCorsoPdfRow } from "@/lib/lavorazioni/lavorazioni-list-pdf";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function mezzoLabel(row: LavorazioneListRow): string {
  const m = row.mezzo;
  if (!m) return "—";
  const parts = [m.marca, m.modello].map((p) => (p ?? "").trim()).filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

function clienteFromRow(row: LavorazioneListRow): string {
  return (row.mezzo?.cliente ?? "").trim() || "—";
}

/** Mappa righe LIGHT server → modello PDF lista in corso. */
export function mapLavorazioniListRowsToPdfRows(rows: readonly LavorazioneListRow[]): LavorazioniInCorsoPdfRow[] {
  return rows.map((row) => {
    const m = row.mezzo;
    return {
      cliente: clienteFromRow(row),
      attrezzatura: mezzoLabel(row),
      identificazione: formatIdentificazionePdfCell(m?.targa ?? "", m?.matricola ?? "", m?.numero_scuderia ?? ""),
      stato: (row.stato ?? "").trim() || "—",
      priorita: (row.priorita ?? "").trim() || "—",
      prioritaSortKey: row.priorita ?? "",
      addetto: "—",
    };
  });
}
