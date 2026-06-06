import { migrateSchedeStore, normalizeSchedeBundle } from "@/lib/schede/schede-store-migrate";
import { LAVORAZIONI_SCHEDE_STORE_CHANGED } from "@/lib/schede/schede-store-events";
import type { LavorazioneSchedeBundle, LavorazioneSchedeStore } from "@/types/schede";

export const LAVORAZIONI_SCHEDE_STORAGE_KEY = "gestionale-lavorazioni-schede-v1";

/** Max lavorazioni persistite in localStorage (LRU per accessOrder). */
export const LAVORAZIONI_SCHEDE_STORAGE_MAX_ENTRIES = 150;

/** TTL intero store — oltre questa età il persist viene scartato al load. */
export const LAVORAZIONI_SCHEDE_STORAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const MAX_FILE_BYTES = 900_000;

type PersistedSchedeEnvelope = {
  v: 1;
  savedAt: string;
  accessOrder: string[];
  bundles: LavorazioneSchedeStore;
};

function isEnvelope(raw: unknown): raw is PersistedSchedeEnvelope {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as PersistedSchedeEnvelope;
  return o.v === 1 && typeof o.savedAt === "string" && Array.isArray(o.accessOrder) && !!o.bundles;
}

function envelopeExpired(savedAt: string): boolean {
  const t = Date.parse(savedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > LAVORAZIONI_SCHEDE_STORAGE_TTL_MS;
}

/** Riduce store a max N entry preservando ordine LRU (ultime in accessOrder). */
export function pruneLavorazioneSchedeStore(
  store: LavorazioneSchedeStore,
  accessOrder: string[],
  maxEntries = LAVORAZIONI_SCHEDE_STORAGE_MAX_ENTRIES,
): { store: LavorazioneSchedeStore; accessOrder: string[] } {
  const knownIds = new Set(Object.keys(store));
  const order = accessOrder.filter((id) => knownIds.has(id));
  for (const id of knownIds) {
    if (!order.includes(id)) order.push(id);
  }
  if (order.length <= maxEntries) {
    return { store, accessOrder: order };
  }
  const keep = new Set(order.slice(-maxEntries));
  const pruned: LavorazioneSchedeStore = {};
  for (const id of keep) {
    const b = store[id];
    if (b) pruned[id] = b;
  }
  return { store: pruned, accessOrder: order.slice(-maxEntries) };
}

export function touchLavorazioneSchedeAccess(
  accessOrder: string[],
  lavorazioneIds: string[],
): string[] {
  const touched = new Set(lavorazioneIds.map((id) => id.trim()).filter(Boolean));
  const next = accessOrder.filter((id) => !touched.has(id));
  next.push(...touched);
  return next;
}

export function loadLavorazioneSchedeStore(): LavorazioneSchedeStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LAVORAZIONI_SCHEDE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (isEnvelope(parsed)) {
      if (envelopeExpired(parsed.savedAt)) {
        window.localStorage.removeItem(LAVORAZIONI_SCHEDE_STORAGE_KEY);
        return {};
      }
      return migrateSchedeStore(parsed.bundles);
    }
    if (!parsed || typeof parsed !== "object") return {};
    return migrateSchedeStore(parsed as LavorazioneSchedeStore);
  } catch {
    return {};
  }
}

export function saveLavorazioneSchedeStore(
  store: LavorazioneSchedeStore,
  touchedIds?: string[],
): void {
  if (typeof window === "undefined") return;
  try {
    let accessOrder: string[] = [];
    const existingRaw = window.localStorage.getItem(LAVORAZIONI_SCHEDE_STORAGE_KEY);
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw) as unknown;
        if (isEnvelope(parsed) && !envelopeExpired(parsed.savedAt)) {
          accessOrder = parsed.accessOrder;
        }
      } catch {
        /* ignore corrupt envelope */
      }
    }
    const ids = touchedIds?.length ? touchedIds : Object.keys(store);
    accessOrder = touchLavorazioneSchedeAccess(accessOrder, ids);
    const pruned = pruneLavorazioneSchedeStore(store, accessOrder);
    const envelope: PersistedSchedeEnvelope = {
      v: 1,
      savedAt: new Date().toISOString(),
      accessOrder: pruned.accessOrder,
      bundles: pruned.store,
    };
    window.localStorage.setItem(LAVORAZIONI_SCHEDE_STORAGE_KEY, JSON.stringify(envelope));
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
