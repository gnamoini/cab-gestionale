import { isPreventiviNotificationsPath } from "@/lib/lavorazioni/admin-notifications";
import type {
  PreventivoRecord,
  PreventivoStato,
  PreventivoStatoCliente,
  PreventivoStatoWorkflow,
} from "@/lib/preventivi/types";

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

type PreventivoAcceptanceSnapshot = {
  statoCliente: PreventivoStatoCliente | null;
  statoWorkflow: PreventivoStatoWorkflow;
};

export function didTransitionToAccettato(
  prev: PreventivoAcceptanceSnapshot | null | undefined,
  curr: PreventivoAcceptanceSnapshot,
): boolean {
  const nowAccepted = curr.statoCliente === "accettato" || curr.statoWorkflow === "acquisito";
  if (!nowAccepted) return false;
  const wasAccepted = prev?.statoCliente === "accettato" || prev?.statoWorkflow === "acquisito";
  return !wasAccepted;
}

/** @deprecated use didTransitionToAccettato */
export function didTransitionToConfermato(prevStato: string | undefined, currStato: PreventivoStato): boolean {
  if (currStato !== "confermato") return false;
  const prev = prevStato?.trim();
  if (!prev) return false;
  return prev !== "confermato";
}

/** @deprecated use didTransitionToAccettato */
export function didTransitionToApprovato(prevStato: string | undefined, currStato: PreventivoStato): boolean {
  return didTransitionToConfermato(prevStato, currStato);
}

export function preventivoApprovatoEventToIntent(input: {
  preventivoId: string;
  prevRecord: PreventivoAcceptanceSnapshot | null | undefined;
  currRecord: PreventivoRecord | null | undefined;
  pathname: string;
  isLocalUpdate: boolean;
}): PreventivoApprovatoIntent | null {
  const { preventivoId, prevRecord, currRecord, pathname, isLocalUpdate } = input;
  if (isLocalUpdate) return null;
  if (isPreventiviNotificationsPath(pathname)) return null;
  if (!currRecord || currRecord.id !== preventivoId) return null;
  if (!didTransitionToAccettato(prevRecord, currRecord)) return null;
  return preventivoRecordToApprovatoIntent(currRecord);
}
