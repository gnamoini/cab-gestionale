import {
  buildFornitoreSnapshotFromLabel,
  ordineFornitoreFornitoreSnapshotToRecord,
} from "@/lib/ordini-fornitori/fornitore-snapshot";
import {
  fornitoreAnagraficaToOrdineSnapshot,
  type FornitoreAnagraficaSettings,
} from "@/lib/magazzino/fornitore-anagrafica";
import { nextOrdineNumeroFromRecords } from "@/lib/ordini-fornitori/ordine-fornitore-numero";
import {
  emptyOrdineFornitoreLogistica,
  ordineFornitoreLogisticaToRecord,
} from "@/lib/ordini-fornitori/ordine-fornitore-logistica";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildEmptyOrdineFornitore(
  existing: readonly Pick<OrdineFornitoreRecord, "numero">[] = [],
): OrdineFornitoreRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    numero: nextOrdineNumeroFromRecords(existing),
    status: "bozza",
    oggettoOrdine: "",
    dataOrdine: todayIsoDate(),
    fornitoreLabel: "",
    fornitoreSnapshot: {},
    destinazione: "",
    destinazioneSnapshot: {},
    logisticaSnapshot: ordineFornitoreLogisticaToRecord(emptyOrdineFornitoreLogistica()),
    note: "",
    imponibileRighe: 0,
    trasporto: 0,
    imponibile: 0,
    ivaPercent: 22,
    iva: 0,
    totale: 0,
    lavorazioneId: null,
    preventivoId: null,
    schedaLavorazioneId: null,
    pdfArtifactHash: null,
    meta: {},
    createdBy: null,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    righe: [],
  };
}

export function applyFornitoreLabelToRecord(
  record: OrdineFornitoreRecord,
  label: string,
  anagrafica?: FornitoreAnagraficaSettings | null,
): OrdineFornitoreRecord {
  const trimmed = label.trim();
  if (trimmed === record.fornitoreLabel.trim()) return record;
  const fornitoreSnapshot = anagrafica
    ? ordineFornitoreFornitoreSnapshotToRecord(fornitoreAnagraficaToOrdineSnapshot(trimmed, anagrafica))
    : buildFornitoreSnapshotFromLabel(trimmed);
  return {
    ...record,
    fornitoreLabel: trimmed,
    fornitoreSnapshot,
  };
}
