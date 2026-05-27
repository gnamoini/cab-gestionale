import { migrateSchedeStore, normalizeSchedeBundle } from "@/lib/schede/schede-store-migrate";
import { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/lib/schede/schede-store-events";
import type { LavorazioneSchedeBundle, LavorazioneSchedeStore } from "@/types/schede";

export const LAVORAZIONI_SCHEDE_STORAGE_KEY = "gestionale-lavorazioni-schede-v1";

const MAX_FILE_BYTES = 900_000;

export function loadLavorazioneSchedeStore(): LavorazioneSchedeStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LAVORAZIONI_SCHEDE_STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return {};
    return migrateSchedeStore(p as LavorazioneSchedeStore);
  } catch {
    return {};
  }
}

export function saveLavorazioneSchedeStore(store: LavorazioneSchedeStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAVORAZIONI_SCHEDE_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(LAVORAZIONI_SCHEDE_STORE_CHANGED));
  } catch {
    /* quota */
  }
}

export function getOrCreateBundle(
  store: LavorazioneSchedeStore,
  lavorazioneId: string,
  codice?: string | null,
): LavorazioneSchedeBundle {
  const ex = store[lavorazioneId];
  if (ex) {
    const normalized = normalizeSchedeBundle(ex);
    const c = codice?.trim();
    if (c && !normalized.codice?.trim()) {
      return { ...normalized, codice: c };
    }
    return normalized;
  }
  return {
    lavorazioneId,
    codice: codice?.trim() || null,
    ingresso: null,
    lavorazioni: null,
    ricambi: null,
  };
}

export function migrateSchedeLavorazioneId(
  store: LavorazioneSchedeStore,
  fromId: string,
  toId: string,
): LavorazioneSchedeStore {
  const b = store[fromId];
  if (!b) return store;
  const next = { ...store };
  delete next[fromId];
  next[toId] = { ...b, lavorazioneId: toId };
  return next;
}

export function assertFileSizeOk(base64Len: number): boolean {
  const approxBytes = Math.floor((base64Len * 3) / 4);
  return approxBytes <= MAX_FILE_BYTES;
}
