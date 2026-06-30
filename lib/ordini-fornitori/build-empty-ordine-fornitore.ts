import { buildFornitoreSnapshotFromLabel } from "@/lib/ordini-fornitori/fornitore-snapshot";
import { nextOrdineNumeroFromRecords } from "@/lib/ordini-fornitori/ordine-fornitore-numero";
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
    dataOrdine: todayIsoDate(),
    fornitoreLabel: "",
    fornitoreSnapshot: {},
    destinazione: "",
    destinazioneSnapshot: {},
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
): OrdineFornitoreRecord {
  const trimmed = label.trim();
  return {
    ...record,
    fornitoreLabel: trimmed,
    fornitoreSnapshot: buildFornitoreSnapshotFromLabel(trimmed, record.fornitoreSnapshot),
  };
}
