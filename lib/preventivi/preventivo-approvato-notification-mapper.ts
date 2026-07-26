import { isPreventiviNotificationsPath } from "@/lib/lavorazioni/admin-notifications";
import type { PreventivoRecord, PreventivoStato } from "@/lib/preventivi/types";

export type PreventivoApprovatoIntent = {
  preventivoId: string;
  numero: string;
  cliente: string;
  totale: number;
  createdAt: string;
};

export function preventivoRecordToApprovatoIntent(record: PreventivoRecord): PreventivoApprovatoIntent {
  return {
    preventivoId: record.id,
    numero: record.numero?.trim() || record.id,
    cliente: record.cliente?.trim() || "",
    totale: record.totaleFinale ?? 0,
    createdAt: record.aggiornatoAt?.trim() || new Date().toISOString(),
  };
}

export function didTransitionToConfermato(prevStato: string | undefined, currStato: PreventivoStato): boolean {
  if (currStato !== "confermato") return false;
  const prev = prevStato?.trim();
  if (!prev) return false;
  return prev !== "confermato";
}

/** @deprecated use didTransitionToConfermato */
export function didTransitionToApprovato(prevStato: string | undefined, currStato: PreventivoStato): boolean {
  return didTransitionToConfermato(prevStato, currStato);
}

export function preventivoApprovatoEventToIntent(input: {
  preventivoId: string;
  prevStato: string | undefined;
  currRecord: PreventivoRecord | null | undefined;
  pathname: string;
  isLocalUpdate: boolean;
}): PreventivoApprovatoIntent | null {
  const { preventivoId, prevStato, currRecord, pathname, isLocalUpdate } = input;
  if (isLocalUpdate) return null;
  if (isPreventiviNotificationsPath(pathname)) return null;
  if (!currRecord || currRecord.id !== preventivoId) return null;
  if (!didTransitionToConfermato(prevStato, currRecord.stato)) return null;
  return preventivoRecordToApprovatoIntent(currRecord);
}
