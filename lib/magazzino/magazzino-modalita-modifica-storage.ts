const MAGAZZINO_MODALITA_MODIFICA_KEY = "gestionale-magazzino-modalita-modifica-v1";

/** Modalità modifica attiva: le variazioni scorta contano nelle statistiche. */
export function readMagazzinoModalitaModifica(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MAGAZZINO_MODALITA_MODIFICA_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMagazzinoModalitaModifica(active: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAGAZZINO_MODALITA_MODIFICA_KEY, active ? "1" : "0");
  } catch {
    /* ignore quota */
  }
}
