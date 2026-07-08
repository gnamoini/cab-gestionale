import { parseOrdineFornitoreDestinatarioSnapshot } from "@/lib/ordini-fornitori/destinatario-snapshot";
import { ordineFornitoreLogisticaHasData, isDefaultOrdineFornitoreLogistica, parseOrdineFornitoreLogistica } from "@/lib/ordini-fornitori/ordine-fornitore-logistica";
import { parseOrdineFornitoreFornitoreSnapshot } from "@/lib/ordini-fornitori/fornitore-snapshot";
import type { OrdineFornitoreRecord, OrdineFornitoreRiga } from "@/lib/ordini-fornitori/types";

function righeFingerprint(righe: OrdineFornitoreRiga[]) {
  return righe.map((r) => ({
    codice: r.codice,
    descrizione: r.descrizione,
    quantita: r.quantita,
    prezzoUnitario: r.prezzoUnitario,
    scontoPercent: r.scontoPercent,
    unitaMisura: r.unitaMisura,
    ivaPercent: r.ivaPercent,
    meta: r.meta,
  }));
}

export function ordineFornitoreEditorFingerprint(record: OrdineFornitoreRecord): string {
  return JSON.stringify({
    status: record.status,
    oggettoOrdine: record.oggettoOrdine,
    dataOrdine: record.dataOrdine,
    fornitoreLabel: record.fornitoreLabel,
    fornitoreSnapshot: record.fornitoreSnapshot,
    destinazione: record.destinazione,
    destinazioneSnapshot: record.destinazioneSnapshot,
    logisticaSnapshot: record.logisticaSnapshot,
    note: record.note,
    ivaPercent: record.ivaPercent,
    righe: righeFingerprint(record.righe),
  });
}

export function isOrdineFornitoreEditorDirty(a: OrdineFornitoreRecord, b: OrdineFornitoreRecord): boolean {
  return ordineFornitoreEditorFingerprint(a) !== ordineFornitoreEditorFingerprint(b);
}

/** True se l'utente ha inserito dati oltre al baseline (es. auto-prefill destinatario). */
export function ordineFornitoreHasUserData(record: OrdineFornitoreRecord): boolean {
  if (record.fornitoreLabel.trim()) return true;
  if (record.oggettoOrdine.trim()) return true;
  if (record.note.trim()) return true;
  if (record.righe.length > 0) return true;

  const fornitore = parseOrdineFornitoreFornitoreSnapshot(record.fornitoreSnapshot, record.fornitoreLabel);
  if (
    fornitore.indirizzo.trim() ||
    fornitore.partitaIva.trim() ||
    fornitore.codiceFiscale.trim() ||
    (fornitore.ragioneSociale.trim() && fornitore.ragioneSociale.trim() !== record.fornitoreLabel.trim())
  ) {
    return true;
  }

  const dest = parseOrdineFornitoreDestinatarioSnapshot(record.destinazioneSnapshot, record.destinazione);
  if (dest.label.trim() || dest.partitaIva.trim() || dest.codiceFiscale.trim() || dest.telefono.trim() || dest.bancaAppoggioNome.trim() || dest.bancaAppoggioIban.trim()) {
    return true;
  }

  if (ordineFornitoreLogisticaHasData(record.logisticaSnapshot)) {
    const logistica = parseOrdineFornitoreLogistica(record.logisticaSnapshot);
    if (!isDefaultOrdineFornitoreLogistica(logistica)) return true;
  }

  return false;
}

export function ordineFornitoreNeedsCloseConfirm(
  record: OrdineFornitoreRecord,
  baseline: OrdineFornitoreRecord,
): boolean {
  return isOrdineFornitoreEditorDirty(record, baseline) && ordineFornitoreHasUserData(record);
}
