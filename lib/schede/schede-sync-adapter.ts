"use client";

import {
  bundleToSchedaPayloads,
  mergeSchedeStores,
  schedaInsertFromBundlePart,
  schedaRowsToStore,
  schedaUpdateFromContenuto,
} from "@/lib/schede/schede-db-mapper";
import { normalizeSchedaTipoDb } from "@/lib/schede/scheda-tipo-db-mapper";
import { isSchedeDbPrimary } from "@/lib/schede/schede-db-primary";
import {
  getOrCreateBundle,
  loadLavorazioneSchedeStore,
  saveLavorazioneSchedeStore,
} from "@/lib/schede/lavorazioni-schede-storage";
import { schedeService } from "@/src/services/schede.service";
import type { LavorazioneSchedeBundle, LavorazioneSchedeStore } from "@/types/schede";

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

function cacheStoreLocally(store: LavorazioneSchedeStore): void {
  saveLavorazioneSchedeStore(store);
}

/** Carica bundle schede da DB — unica source per React Query. */
export async function fetchSchedeBundlesFromDb(): Promise<LavorazioneSchedeStore> {
  const remoteRes = await schedeService.getAll();
  if (remoteRes.success && remoteRes.data) {
    const remote = schedaRowsToStore(remoteRes.data);
    if (isSchedeDbPrimary()) {
      cacheStoreLocally(remote);
    }
    return remote;
  }
  if (isSchedeDbPrimary()) {
    console.warn("[schede] fetch remoto fallito; cache UI vuota.");
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
  if (isSchedeDbPrimary()) {
    const db = await syncBundleToDb(bundle);
    if (!db.ok) return db;
    const store = loadLavorazioneSchedeStore();
    store[bundle.lavorazioneId] = bundle;
    cacheStoreLocally(store);
    return { ok: true };
  }

  const store = loadLavorazioneSchedeStore();
  store[bundle.lavorazioneId] = bundle;
  cacheStoreLocally(store);
  const db = await syncBundleToDb(bundle);
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
    cacheStoreLocally(store);
    return { ok: true };
  }

  cacheStoreLocally(store);
  for (const id of ids) {
    const bundle = store[id];
    if (!bundle) continue;
    const db = await syncBundleToDb(bundle);
    if (!db.ok) return db;
  }
  return { ok: true };
}
