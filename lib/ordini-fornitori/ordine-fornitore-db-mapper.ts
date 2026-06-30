import type { OrdineFornitoreRecord, OrdineFornitoreRiga } from "@/lib/ordini-fornitori/types";
import type { OrdineFornitoreRigaRow, OrdineFornitoreRow } from "@/src/types/supabase-tables";

export function mapOrdineFornitoreRigaRow(row: OrdineFornitoreRigaRow): OrdineFornitoreRiga {
  return {
    id: row.id,
    ordine: row.ordine,
    ricambioId: row.ricambio_id,
    codice: row.codice ?? "",
    descrizione: row.descrizione,
    quantita: Number(row.quantita),
    prezzoUnitario: Number(row.prezzo_unitario),
    scontoPercent: Number(row.sconto_percent),
    totaleRiga: Number(row.totale_riga),
    meta: (row.meta ?? {}) as Record<string, unknown>,
  };
}

export function mapOrdineFornitoreRow(
  row: OrdineFornitoreRow,
  righe: OrdineFornitoreRigaRow[] = [],
): OrdineFornitoreRecord {
  return {
    id: row.id,
    numero: row.numero ?? "",
    status: row.status,
    dataOrdine: row.data_ordine,
    fornitoreLabel: row.fornitore_label,
    fornitoreSnapshot: (row.fornitore_snapshot ?? {}) as Record<string, unknown>,
    destinazione: row.destinazione ?? "",
    destinazioneSnapshot: (row.destinazione_snapshot ?? {}) as Record<string, unknown>,
    note: row.note ?? "",
    imponibileRighe: Number(row.imponibile_righe),
    trasporto: Number(row.trasporto),
    imponibile: Number(row.imponibile),
    ivaPercent: Number(row.iva_percent),
    iva: Number(row.iva),
    totale: Number(row.totale),
    lavorazioneId: row.lavorazione_id,
    preventivoId: row.preventivo_id,
    schedaLavorazioneId: row.scheda_lavorazione_id,
    pdfArtifactHash: row.pdf_artifact_hash,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    righe: righe
      .filter((r) => r.ordine_id === row.id)
      .sort((a, b) => a.ordine - b.ordine)
      .map(mapOrdineFornitoreRigaRow),
  };
}
