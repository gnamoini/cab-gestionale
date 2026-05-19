import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";

export type MagazzinoUndoScope = {
  userId: string;
  sessionId: string;
};

export function entryMatchesMagazzinoUndoScope(e: MagazzinoChangeLogEntry, scope: MagazzinoUndoScope | null): boolean {
  if (!scope) return true;
  if (!e.autoreUserId || !e.undoSessionId) return false;
  return e.autoreUserId === scope.userId && e.undoSessionId === scope.sessionId;
}

/** Ultima voce di log annullabile: solo aggiornamento scorta (una modifica), usata da «Annulla ultima modifica». */
export function isUndoableScortaOnlyEntry(e: MagazzinoChangeLogEntry): boolean {
  return e.tipo === "update" && e.changes.length === 1 && e.changes[0]?.campo === "Scorta";
}

/** Prima voce in `entries` (tipicamente la più recente) per ricambio, se annullabile come solo-scorta. */
export function latestUndoableScortaEntryForRicambio(
  entries: MagazzinoChangeLogEntry[],
  ricambioId: string,
  scope?: MagazzinoUndoScope | null,
): MagazzinoChangeLogEntry | null {
  for (const e of entries) {
    if (e.ricambioId !== ricambioId) continue;
    if (e.annullato) continue;
    if (scope && !entryMatchesMagazzinoUndoScope(e, scope)) continue;
    if (!isUndoableScortaOnlyEntry(e)) continue;
    return e;
  }
  return null;
}

export function parseScortaChange(
  e: MagazzinoChangeLogEntry,
): { prima: number; dopo: number } | null {
  const ch = e.changes[0];
  if (!ch || ch.campo !== "Scorta") return null;
  const prima = Number.parseInt(ch.prima, 10);
  const dopo = Number.parseInt(ch.dopo, 10);
  if (Number.isNaN(prima) || Number.isNaN(dopo)) return null;
  return { prima, dopo };
}
