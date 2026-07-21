const MAGAZZINO_MODALITA_MODIFICA_KEY = "gestionale-magazzino-modalita-modifica-v1";
const MAGAZZINO_MODALITA_MODIFICA_VERSION_KEY = "gestionale-magazzino-modalita-modifica-version";
const MAGAZZINO_MODALITA_MODIFICA_VERSION = 2;

function readStoredVersion(): number {
  if (typeof window === "undefined") return MAGAZZINO_MODALITA_MODIFICA_VERSION;
  try {
    const raw = window.localStorage.getItem(MAGAZZINO_MODALITA_MODIFICA_VERSION_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeStoredVersion(version: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAGAZZINO_MODALITA_MODIFICA_VERSION_KEY, String(version));
  } catch {
    /* ignore quota */
  }
}

/** Modalità modifica attiva: le variazioni scorta contano nelle statistiche. */
export function readMagazzinoModalitaModifica(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(MAGAZZINO_MODALITA_MODIFICA_KEY);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

export function writeMagazzinoModalitaModifica(active: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAGAZZINO_MODALITA_MODIFICA_KEY, active ? "1" : "0");
    writeStoredVersion(MAGAZZINO_MODALITA_MODIFICA_VERSION);
  } catch {
    /* ignore quota */
  }
}

/** Upgrade v1→v2: forza ON una volta; dopo v2 le preferenze utente restano intatte. */
export function migrateMagazzinoModalitaModificaPreferenceV2(): void {
  if (typeof window === "undefined") return;
  if (readStoredVersion() >= MAGAZZINO_MODALITA_MODIFICA_VERSION) return;
  try {
    writeMagazzinoModalitaModifica(true);
  } catch {
    /* ignore quota */
  }
}

export {
  MAGAZZINO_MODALITA_MODIFICA_KEY,
  MAGAZZINO_MODALITA_MODIFICA_VERSION,
  MAGAZZINO_MODALITA_MODIFICA_VERSION_KEY,
};
