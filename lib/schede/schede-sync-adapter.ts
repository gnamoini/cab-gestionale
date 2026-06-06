"use client";

import type { QueryClient } from "@tanstack/react-query";
import {
  bundleToSchedaPayloads,
  mergeSchedeStores,
  schedaInsertFromBundlePart,
  schedaRowsToBundle,
  schedaRowsToStore,
  schedaUpdateFromContenuto,
} from "@/lib/schede/schede-db-mapper";
export { refreshSchedeBundleSliceForSchedaId } from "@/lib/schede/schede-bundle-cache-patch";
import { normalizeSchedaTipoDb } from "@/lib/schede/scheda-tipo-db-mapper";
import { isSchedeDbPrimary } from "@/lib/schede/schede-db-primary";
import {
  getOrCreateBundle,
  loadLavorazioneSchedeStore,
  saveLavorazioneSchedeStore,
} from "@/lib/schede/lavorazioni-schede-storage";
import { schedeService } from "@/src/services/schede.service";
import { SCHEde_BUNDLES_QUERY_KEY } from "@/src/lib/react-query/query-keys";
import { clampSchedeBundle } from "@/lib/validation/clamp-free-text";
import type { LavorazioneSchedeBundle, LavorazioneSchedeStore } from "@/types/schede";

const SCHEde_FETCH_CONCURRENCY = 8;

export const SCHEDE_CONCURRENCY_CONFLICT =
  "Un altro utente ha aggiornato questa scheda. Ricarica e riprova.";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_RE.test(id.trim());
}

async function syncBundleToDb(bundle: LavorazioneSchedeBundle): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUuid(bundle.lavorazioneId)) {
    return { ok: false, error: "ID lavorazione non valido per sincronizzazione schede." };
  }

  const existing = await schedeService.getAll({ lavorazione_id: bundle.lavorazioneId });
  const rows = existing.success && existing.data ? existing.data : [];
  if (!existing.success) {
    return { ok: false, error: existing.error ?? "Lettura schede dal database non riuscita." };
  }

  const payloads = bundleToSchedaPayloads(bundle);

  const byTipo = new Map(
    rows
      .map((r) => {
        const normalized = normalizeSchedaTipoDb(r.tipo);
        return normalized ? ([normalized, r] as const) : null;
      })
      .filter((e): e is [ReturnType<typeof normalizeSchedaTipoDb> & string, (typeof rows)[number]] => e !== null),
  );

  const payloadTipi = new Set(
    payloads
      .map((p) => normalizeSchedaTipoDb(p.tipo))
      .filter((t): t is NonNullable<typeof t> => t !== null),
  );

  for (const part of payloads) {
    const row = byTipo.get(part.tipo);
    if (row) {
      const upd = await schedeService.update(row.id, {
        ...schedaUpdateFromContenuto(part.contenuto),
        updated_at: row.updated_at,
      });
      if (!upd.success) return { ok: false, error: upd.error ?? "Aggiornamento scheda fallito." };
    } else {
      const ins = await schedeService.create(
        schedaInsertFromBundlePart(bundle.lavorazioneId, part.tipo, part.contenuto),
      );
      if (!ins.success) return { ok: false, error: ins.error ?? "Creazione scheda fallita." };
    }
  }

  for (const row of rows) {
    const normalized = normalizeSchedaTipoDb(row.tipo);
    if (!normalized || payloadTipi.has(normalized)) continue;
    const del = await schedeService.remove(row.id);
    if (!del.success) return { ok: false, error: del.error ?? "Eliminazione scheda fallita." };
  }

  return { ok: true };
}

function cacheStoreLocally(store: LavorazioneSchedeStore, touchedIds?: string[]): void {
  saveLavorazioneSchedeStore(store, touchedIds);
}

/** Fetch bundle schede per singola lavorazione (no monolith). */
export async function fetchSchedeBundleForLavorazione(
  lavorazioneId: string,
): Promise<LavorazioneSchedeBundle | null> {
  const id = lavorazioneId.trim();
  if (!id) return null;
  const remoteRes = await schedeService.getAll({ lavorazione_id: id });
  if (!remoteRes.success) return null;
  return schedaRowsToBundle(id, remoteRes.data ?? []);
}

/** Fetch parallelo per più lavorazioni (chunked). */
export async function fetchSchedeBundlesForLavorazioni(
  lavorazioneIds: readonly string[],
): Promise<LavorazioneSchedeStore> {
  const unique = [...new Set(lavorazioneIds.map((id) => id.trim()).filter(Boolean))];
  const store: LavorazioneSchedeStore = {};
  for (let i = 0; i < unique.length; i += SCHEde_FETCH_CONCURRENCY) {
    const chunk = unique.slice(i, i + SCHEde_FETCH_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (id) => {
        const bundle = await fetchSchedeBundleForLavorazione(id);
        return bundle ? ([id, bundle] as const) : null;
      }),
    );
    for (const entry of results) {
      if (entry) store[entry[0]] = entry[1];
    }
  }
  return store;
}

function schedeEnsureQueryKey(lavorazioneIds: readonly string[]): readonly unknown[] {
  const sorted = [...new Set(lavorazioneIds.map((id) => id.trim()).filter(Boolean))].sort();
  return [...SCHEde_BUNDLES_QUERY_KEY, "ensure", sorted.join(",")] as const;
}

/** Carica in cache RQ solo i bundle mancanti per gli id richiesti. */
export async function ensureSchedeBundlesInCache(
  qc: QueryClient,
  lavorazioneIds: readonly string[],
): Promise<LavorazioneSchedeStore> {
  const unique = [...new Set(lavorazioneIds.map((id) => id.trim()).filter(Boolean))];
  const prev = qc.getQueryData<LavorazioneSchedeStore>(SCHEde_BUNDLES_QUERY_KEY) ?? {};
  const missing = unique.filter((id) => !prev[id]);
  if (missing.length === 0) return prev;

  const fetched = await fetchSchedeBundlesForLavorazioni(missing);
  const merged = { ...prev, ...fetched };
  qc.setQueryData(SCHEde_BUNDLES_QUERY_KEY, merged);

  if (isSchedeDbPrimary()) {
    cacheStoreLocally(merged, missing);
  }
  return merged;
}

export { schedeEnsureQueryKey };

/** @deprecated Monolith getAll — usare `ensureSchedeBundlesInCache` per lavorazioneId. */
export async function fetchSchedeBundlesFromDb(): Promise<LavorazioneSchedeStore> {
  if (isSchedeDbPrimary()) {
    console.warn("[schede] fetchSchedeBundlesFromDb monolith deprecato; usare lazy per lavorazioneId.");
    return {};
  }
  return loadLavorazioneSchedeStore();
}

/** @deprecated Usare `fetchSchedeBundlesFromDb`. */
export async function fetchSchedeStoreMerged(): Promise<LavorazioneSchedeStore> {
  return fetchSchedeBundlesFromDb();
}

export async function persistSchedeBundle(
  bundle: LavorazioneSchedeBundle,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const safe = clampSchedeBundle(bundle);
  if (isSchedeDbPrimary()) {
    const db = await syncBundleToDb(safe);
    if (!db.ok) return db;
    const store = loadLavorazioneSchedeStore();
    store[safe.lavorazioneId] = safe;
    cacheStoreLocally(store, [safe.lavorazioneId]);
    return { ok: true };
  }

  const store = loadLavorazioneSchedeStore();
  store[safe.lavorazioneId] = safe;
  cacheStoreLocally(store, [safe.lavorazioneId]);
  const db = await syncBundleToDb(safe);
  if (!db.ok) return db;
  return { ok: true };
}

export function getOrCreateBundleMerged(
  store: LavorazioneSchedeStore,
  lavorazioneId: string,
): LavorazioneSchedeBundle {
  return getOrCreateBundle(store, lavorazioneId);
}

/** Salva store e sincronizza con Supabase (DB-first quando abilitato). */
export async function persistSchedeStore(
  store: LavorazioneSchedeStore,
  lavorazioneId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ids = lavorazioneId ? [lavorazioneId] : Object.keys(store);

  if (isSchedeDbPrimary()) {
    for (const id of ids) {
      const bundle = store[id];
      if (!bundle) continue;
      const db = await syncBundleToDb(bundle);
      if (!db.ok) return db;
    }
    cacheStoreLocally(store, ids);
    return { ok: true };
  }

  cacheStoreLocally(store, ids);
  for (const id of ids) {
    const bundle = store[id];
    if (!bundle) continue;
    const db = await syncBundleToDb(bundle);
    if (!db.ok) return db;
  }
  return { ok: true };
}
