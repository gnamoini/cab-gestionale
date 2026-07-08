import { nextOrdineNumeroFromRecords } from "@/lib/ordini-fornitori/ordine-fornitore-numero";
import type { OrdineFornitoreRecord, OrdineFornitoreRiga } from "@/lib/ordini-fornitori/types";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function cloneRiga(riga: OrdineFornitoreRiga, ordine: number): OrdineFornitoreRiga {
  return {
    ...riga,
    id: crypto.randomUUID(),
    ordine,
    meta: { ...riga.meta },
  };
}

/** Duplica ordine per editor nuovo: nuovo id/numero, data odierna, bozza, link esterni azzerati. */
export function cloneOrdineFornitoreRecord(
  source: OrdineFornitoreRecord,
  existing: readonly Pick<OrdineFornitoreRecord, "numero">[],
): OrdineFornitoreRecord {
  const now = new Date().toISOString();
  const righe = source.righe.map((r, i) => cloneRiga(r, i + 1));
  return {
    ...source,
    id: crypto.randomUUID(),
    numero: nextOrdineNumeroFromRecords(existing),
    status: "bozza",
    dataOrdine: todayIsoDate(),
    lavorazioneId: null,
    preventivoId: null,
    schedaLavorazioneId: null,
    pdfArtifactHash: null,
    createdBy: null,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
    meta: { ...source.meta },
    fornitoreSnapshot: { ...source.fornitoreSnapshot },
    destinazioneSnapshot: { ...source.destinazioneSnapshot },
    logisticaSnapshot: { ...source.logisticaSnapshot },
    righe,
  };
}
