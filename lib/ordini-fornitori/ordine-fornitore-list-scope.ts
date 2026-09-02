import { parseOrdineFornitoreLogistica } from "@/lib/ordini-fornitori/ordine-fornitore-logistica";
import { isOrdineSpesaVariaRiga } from "@/lib/ordini-fornitori/ordine-fornitore-spesa-varia";
import {
  ORDINE_FORNITORE_STATUS_ARCHIVIO,
  ORDINE_FORNITORE_STATUS_IN_CORSO,
  ordineFornitoreResidualQty,
} from "@/lib/ordini-fornitori/ordine-fornitore-status-transitions";
import type { OrdineFornitoreRecord, OrdineFornitoreStatus } from "@/lib/ordini-fornitori/types";

export type OrdineFornitoreListScope = "in_corso" | "storico";

export function ordineFornitoreMatchesListScope(
  record: Pick<OrdineFornitoreRecord, "status">,
  scope: OrdineFornitoreListScope,
): boolean {
  const allowed: readonly OrdineFornitoreStatus[] =
    scope === "in_corso" ? ORDINE_FORNITORE_STATUS_IN_CORSO : ORDINE_FORNITORE_STATUS_ARCHIVIO;
  return allowed.includes(record.status);
}

export function ordineFornitoreRigheCount(record: Pick<OrdineFornitoreRecord, "righe">): number {
  return record.righe.filter((r) => !isOrdineSpesaVariaRiga(r.meta)).length;
}

export function ordineFornitoreHasPartialReceipt(record: Pick<OrdineFornitoreRecord, "righe">): boolean {
  return record.righe.some((r) => {
    if (isOrdineSpesaVariaRiga(r.meta)) return false;
    const ricevuta = r.quantitaRicevuta ?? 0;
    return ricevuta > 0 && ricevuta < r.quantita;
  });
}

export function ordineFornitoreHasNote(record: Pick<OrdineFornitoreRecord, "note">): boolean {
  return record.note.trim().length > 0;
}

export function ordineFornitoreDataPrevista(record: Pick<OrdineFornitoreRecord, "logisticaSnapshot">): string {
  return parseOrdineFornitoreLogistica(record.logisticaSnapshot).dataConsegna.trim();
}

export function ordineFornitoreRigaAttesaQty(riga: {
  quantita: number;
  quantitaRicevuta?: number;
}): number {
  return ordineFornitoreResidualQty(riga.quantita, riga.quantitaRicevuta ?? 0);
}

const STATUS_IN_CORSO_SORT_RANK: Record<OrdineFornitoreStatus, number> = {
  in_consegna: 0,
  inviato: 1,
  bozza: 2,
  consegnato: 3,
  annullato: 4,
};

/** Sort ricevimento: in_consegna first, then data prevista asc, then data ordine desc. */
export function compareOrdiniFornitoreInCorso(
  a: OrdineFornitoreRecord,
  b: OrdineFornitoreRecord,
): number {
  const rankA = STATUS_IN_CORSO_SORT_RANK[a.status] ?? 9;
  const rankB = STATUS_IN_CORSO_SORT_RANK[b.status] ?? 9;
  if (rankA !== rankB) return rankA - rankB;

  const prevA = ordineFornitoreDataPrevista(a);
  const prevB = ordineFornitoreDataPrevista(b);
  if (prevA && prevB && prevA !== prevB) return prevA.localeCompare(prevB);
  if (prevA && !prevB) return -1;
  if (!prevA && prevB) return 1;

  return b.dataOrdine.localeCompare(a.dataOrdine) || b.createdAt.localeCompare(a.createdAt);
}

export function compareOrdiniFornitoreStorico(a: OrdineFornitoreRecord, b: OrdineFornitoreRecord): number {
  const closeA = a.dataConsegna ?? a.dataOrdine;
  const closeB = b.dataConsegna ?? b.dataOrdine;
  return closeB.localeCompare(closeA) || b.createdAt.localeCompare(a.createdAt);
}
