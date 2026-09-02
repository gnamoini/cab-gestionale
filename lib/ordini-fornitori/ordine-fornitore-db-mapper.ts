import { readOrdineOggetto } from "@/lib/ordini-fornitori/ordine-fornitore-oggetto";
import { normalizeOrdineFornitoreStatus } from "@/lib/ordini-fornitori/ordine-fornitore-status-transitions";
import { ordineRigheWithLegacyTrasporto } from "@/lib/ordini-fornitori/ordine-fornitore-spesa-varia";
import type { OrdineFornitoreRecord, OrdineFornitoreRiga } from "@/lib/ordini-fornitori/types";
import { readRigaIvaPercent, readRigaUnitaMisura } from "@/lib/ordini-fornitori/ordine-fornitore-riga-meta";
import type { OrdineFornitoreRigaRow, OrdineFornitoreRow } from "@/src/types/supabase-tables";

export function mapOrdineFornitoreRigaRow(row: OrdineFornitoreRigaRow): OrdineFornitoreRiga {
  const meta = (row.meta ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    ordine: row.ordine,
    ricambioId: row.ricambio_id,
    codice: row.codice ?? "",
    descrizione: row.descrizione,
    quantita: Number(row.quantita),
    quantitaRicevuta: Number(row.quantita_ricevuta ?? 0),
    prezzoUnitario: Number(row.prezzo_unitario),
    scontoPercent: Number(row.sconto_percent),
    totaleRiga: Number(row.totale_riga),
    unitaMisura: readRigaUnitaMisura(meta),
    ivaPercent: readRigaIvaPercent(meta),
    meta,
  };
}

export function mapOrdineFornitoreRow(
  row: OrdineFornitoreRow,
  righe: OrdineFornitoreRigaRow[] = [],
): OrdineFornitoreRecord {
  const meta = (row.meta ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    numero: row.numero ?? "",
    status: normalizeOrdineFornitoreStatus(row.status),
    oggettoOrdine: readOrdineOggetto(meta),
    dataOrdine: row.data_ordine,
    dataConsegna: row.data_consegna ?? null,
    fornitoreLabel: row.fornitore_label,
    fornitoreSnapshot: (row.fornitore_snapshot ?? {}) as Record<string, unknown>,
    destinazione: row.destinazione ?? "",
    destinazioneSnapshot: (row.destinazione_snapshot ?? {}) as Record<string, unknown>,
    logisticaSnapshot: (row.logistica_snapshot ?? {}) as Record<string, unknown>,
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
    meta,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    righe: ordineRigheWithLegacyTrasporto(
      righe
        .filter((r) => r.ordine_id === row.id)
        .sort((a, b) => a.ordine - b.ordine)
        .map(mapOrdineFornitoreRigaRow),
      Number(row.trasporto),
      Number(row.iva_percent),
    ),
  };
}
