"use client";

import {
  bundleToSchedaPayloads,
  mergeSchedeStores,
  schedaInsertFromBundlePart,
  schedaRowsToStore,
  schedaUpdateFromContenuto,
} from "@/lib/schede/schede-db-mapper";
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
  const byTipo = new Map(rows.map((r) => [r.tipo, r]));

  for (const part of bundleToSchedaPayloads(bundle)) {
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
    const still = bundleToSchedaPayloads(bundle).some((p) => p.tipo === row.tipo);
    if (!still) {
      await schedeService.remove(row.id);
    }
  }

  return { ok: true };
}

export async function fetchSchedeStoreMerged(): Promise<LavorazioneSchedeStore> {
  const local = loadLavorazioneSchedeStore();
  const remoteRes = await schedeService.getAll();
  if (!remoteRes.success || !remoteRes.data) return local;
  const remote = schedaRowsToStore(remoteRes.data);
  return mergeSchedeStores(local, remote, isSchedeDbPrimary());
}

export async function persistSchedeBundle(
  bundle: LavorazioneSchedeBundle,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const store = loadLavorazioneSchedeStore();
  store[bundle.lavorazioneId] = bundle;
  saveLavorazioneSchedeStore(store);

  const db = await syncBundleToDb(bundle);
  if (!db.ok && isSchedeDbPrimary()) return db;
  return { ok: true };
}

export function getOrCreateBundleMerged(
  store: LavorazioneSchedeStore,
  lavorazioneId: string,
): LavorazioneSchedeBundle {
  return getOrCreateBundle(store, lavorazioneId);
}

/** Salva store locale e sincronizza un bundle (o tutti se `lavorazioneId` assente). */
export async function persistSchedeStore(
  store: LavorazioneSchedeStore,
  lavorazioneId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  saveLavorazioneSchedeStore(store);
  const ids = lavorazioneId ? [lavorazioneId] : Object.keys(store);
  for (const id of ids) {
    const bundle = store[id];
    if (!bundle) continue;
    const db = await syncBundleToDb(bundle);
    if (!db.ok && isSchedeDbPrimary()) return db;
  }
  return { ok: true };
}
