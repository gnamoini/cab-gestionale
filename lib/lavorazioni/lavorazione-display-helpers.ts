import type { LavorazioneSchedeStore } from "@/types/schede";

export const LAVORAZIONE_EMPTY_DISPLAY = "—";

export function isLavorazioneEmptyDisplay(value: string | null | undefined): boolean {
  const t = value?.trim();
  return !t || t === LAVORAZIONE_EMPTY_DISPLAY;
}

/** Utilizzatore per UI tabella: vuoto se assente (no trattino). */
export function utilizzatoreDisplayLabel(raw: string | null | undefined): string {
  return isLavorazioneEmptyDisplay(raw) ? "" : raw!.trim();
}

/**
 * Note operative mostrate in colonna Note: solo note intervento / manuali,
 * mai la descrizione anomalia (resta in scheda ingresso).
 */
export function lavorazioneNoteOperative(
  row: { id: string; note?: string | null },
  schedeStore?: LavorazioneSchedeStore,
): string {
  const fromScheda = schedeStore?.[row.id]?.ingresso?.campi.noteIntervento?.trim();
  if (fromScheda) return fromScheda;
  return (row.note ?? "").trim();
}
