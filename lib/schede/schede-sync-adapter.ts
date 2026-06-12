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
import { primeLavorazioneSchedeRowsCache } from "@/lib/schede/schede-domain-query-cache";
import {
  fetchSchedeBundlesStoreAuthorized,
  fetchSchedeRowsByLavorazioneIdsAuthorized,
} from "@/lib/schede/schede-bundles-fetch-authorized";
import {
  consumeSchedeEnsureAfterInvalidate,
  type EnsureSchedeBundlesOptions,
  shouldRefetchBundleSlice,
} from "@/lib/schede/schede-ensure-options";
import { schedeService, SCHEDA_CONCURRENCY_CONFLICT } from "@/src/services/schede.service";
import { SCHEde_BUNDLES_QUERY_KEY } from "@/src/lib/react-query/query-keys";
import { clampSchedeBundle } from "@/lib/validation/clamp-free-text";
import type { SchedaLavorazioneRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeBundle, LavorazioneSchedeStore } from "@/types/schede";

/** @deprecated Usare SCHEDA_CONCURRENCY_CONFLICT da schede.service */
export const SCHEDE_CONCURRENCY_CONFLICT = SCHEDA_CONCURRENCY_CONFLICT;

export type PersistSchedeErrorResult =
  | { ok: false; kind: "error"; error: string }
  | {
      ok: false;
      kind: "concurrency";
      error: string;
      clientBundle: LavorazioneSchedeBundle;
      serverBundle: LavorazioneSchedeBundle;
    };

export type PersistSchedeResult = { ok: true } | PersistSchedeErrorResult;

export function isSchedaConcurrencyConflict(result: PersistSchedeResult): result is Extract<
  PersistSchedeErrorResult,
  { kind: "concurrency" }
> {
  return !result.ok && result.kind === "concurrency";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(id: string): boolean {
  return UUID_RE.test(id.trim());
}

async function syncBundleToDb(bundle: LavorazioneSchedeBundle): Promise<PersistSchedeResult> {
  if (!isUuid(bundle.lavorazioneId)) {
    return { ok: false, kind: "error", error: "ID lavorazione non valido per sincronizzazione schede." };
  }

  const existing = await schedeService.getAll({ lavorazione_id: bundle.lavorazioneId });
  const rows = existing.success && existing.data ? existing.data : [];
  if (!existing.success) {
    return { ok: false, kind: "error", error: existing.error ?? "Lettura schede dal database non riuscita." };
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
      if (!upd.success) {
        if (upd.error === SCHEDA_CONCURRENCY_CONFLICT) {
          const fresh = await schedeService.getAll({ lavorazione_id: bundle.lavorazioneId });
          const freshRows = fresh.success && fresh.data ? fresh.data : rows;
          return {
            ok: false,
            kind: "concurrency",
            error: SCHEDA_CONCURRENCY_CONFLICT,
            clientBundle: bundle,
            serverBundle: schedaRowsToBundle(bundle.lavorazioneId, freshRows, bundle.codice),
          };
        }
        return { ok: false, kind: "error", error: upd.error ?? "Aggiornamento scheda fallito." };
      }
    } else {
      const ins = await schedeService.create(
        schedaInsertFromBundlePart(bundle.lavorazioneId, part.tipo, part.contenuto),
      );
      if (!ins.success) return { ok: false, kind: "error", error: ins.error ?? "Creazione scheda fallita." };
    }
  }

  for (const row of rows) {
    const normalized = normalizeSchedaTipoDb(row.tipo);
    if (!normalized || payloadTipi.has(normalized)) continue;
    const del = await schedeService.remove(row.id);
    if (!del.success) return { ok: false, kind: "error", error: del.error ?? "Eliminazione scheda fallita." };
  }

  return { ok: true };
}

function cacheStoreLocally(store: LavorazioneSchedeStore, touchedIds?: string[]): void {
  saveLavorazioneSchedeStore(store, touchedIds);
}

/** Fetch bundle schede per singola lavorazione (no monolith). */
export async function fetchSchedeBundleForLavorazione(
  lavorazioneId: string,
  qc?: QueryClient,
): Promise<LavorazioneSchedeBundle | null> {
  const id = lavorazioneId.trim();
  if (!id) return null;
  const remoteRes = await schedeService.getAll({ lavorazione_id: id });
  if (!remoteRes.success) return null;
  const rows = remoteRes.data ?? [];
  if (qc) primeLavorazioneSchedeRowsCache(qc, id, rows);
  return schedaRowsToBundle(id, rows);
}

/** Fetch batch per più lavorazioni — 1 query `.in()` per chunk (sostituisce N× getAll). */
export async function fetchSchedeBundlesForLavorazioni(
  lavorazioneIds: readonly string[],
  qc?: QueryClient,
): Promise<LavorazioneSchedeStore> {
  const unique = [...new Set(lavorazioneIds.map((id) => id.trim()).filter(Boolean))];
  const [storeRes, rowsRes] = await Promise.all([
    fetchSchedeBundlesStoreAuthorized(unique),
    qc ? fetchSchedeRowsByLavorazioneIdsAuthorized(unique) : Promise.resolve(null),
  ]);
  if (!storeRes.success) return {};
  const store = storeRes.data ?? {};
  if (qc && rowsRes?.success) {
    const byLav = new Map<string, SchedaLavorazioneRow[]>();
    for (const row of rowsRes.data ?? []) {
      const list = byLav.get(row.lavorazione_id) ?? [];
      list.push(row);
      byLav.set(row.lavorazione_id, list);
    }
    for (const id of unique) {
      primeLavorazioneSchedeRowsCache(qc, id, byLav.get(id) ?? []);
    }
  }
  return store;
}

function schedeEnsureQueryKey(lavorazioneIds: readonly string[]): readonly unknown[] {
  const sorted = [...new Set(lavorazioneIds.map((id) => id.trim()).filter(Boolean))].sort();
  return [...SCHEde_BUNDLES_QUERY_KEY, "ensure", sorted.join(",")] as const;
}

/** Carica in cache RQ solo i bundle mancanti (o stale) per gli id richiesti. */
export async function ensureSchedeBundlesInCache(
  qc: QueryClient,
  lavorazioneIds: readonly string[],
  options?: EnsureSchedeBundlesOptions,
): Promise<LavorazioneSchedeStore> {
  const unique = [...new Set(lavorazioneIds.map((id) => id.trim()).filter(Boolean))];
  const prev = qc.getQueryData<LavorazioneSchedeStore>(SCHEde_BUNDLES_QUERY_KEY) ?? {};
  const mergedOptions: EnsureSchedeBundlesOptions = {
    ...options,
    afterInvalidate: options?.afterInvalidate ?? consumeSchedeEnsureAfterInvalidate(qc),
  };
  const toFetch = unique.filter((id) => shouldRefetchBundleSlice(prev[id], mergedOptions));
  if (toFetch.length === 0) return prev;

  const fetched = await fetchSchedeBundlesForLavorazioni(toFetch, qc);
  const merged = { ...prev, ...fetched };
  qc.setQueryData(SCHEde_BUNDLES_QUERY_KEY, merged);

  if (isSchedeDbPrimary()) {
    cacheStoreLocally(merged, toFetch);
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

export async function persistSchedeBundle(bundle: LavorazioneSchedeBundle): Promise<PersistSchedeResult> {
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
): Promise<PersistSchedeResult> {
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
