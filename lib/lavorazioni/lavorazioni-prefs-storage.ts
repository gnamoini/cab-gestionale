/**
 * @deprecated Preferire `public.app_settings` (modulo `lavorazioni`, chiave `prefs`).
 * Mantenuto come fallback offline / prima migrazione.
 */
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";

/** @deprecated Chiave legacy; preferire `app_settings`. */
export const LAVORAZIONI_PREFS_STORAGE_KEY = "gestionale-lavorazioni-prefs-v1";

const STORAGE_KEY = LAVORAZIONI_PREFS_STORAGE_KEY;

export type LavorazioniPersistedPrefs = {
  stati?: StatoLavorazioneConfig[];
  addetti?: string[];
  /** Colori addetti assegnati automaticamente (chiave = nome esatto). */
  addettoColors?: Record<string, string>;
  /** Colori priorità (solo chiavi presenti sovrascrivono il default). */
  prioritaColors?: Partial<Record<PrioritaLav, string>>;
};

export function loadLavorazioniPrefs(): LavorazioniPersistedPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return null;
    return p as LavorazioniPersistedPrefs;
  } catch {
    return null;
  }
}

export function saveLavorazioniPrefs(prefs: LavorazioniPersistedPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}

export function clearLavorazioniPrefs(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
