import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export const LAVORAZIONE_EMPTY_DISPLAY = "—";

export function isLavorazioneEmptyDisplay(value: string | null | undefined): boolean {
  const t = value?.trim();
  return !t || t === LAVORAZIONE_EMPTY_DISPLAY;
}

/** Utilizzatore per UI tabella: vuoto se assente (no trattino). */
export function utilizzatoreDisplayLabel(raw: string | null | undefined): string {
  return isLavorazioneEmptyDisplay(raw) ? "" : raw!.trim();
}

/** SSOT: note lavorazione da `lavorazioni.note` (mai descrizione anomalia). */
export function resolveLavorazioneNote(row: { note?: string | null }): string {
  return (row.note ?? "").trim();
}

/** Lista tabella/kanban — alias di resolveLavorazioneNote. */
export function lavorazioneNoteDisplay(row: Pick<LavorazioneListRow, "note">): string {
  return resolveLavorazioneNote(row);
}
