"use client";

import type { QueryClient } from "@tanstack/react-query";
import { isPreventiviDbPrimary } from "@/lib/preventivi/preventivi-db-primary";
import {
  isPreventivoUuid,
  preventivoRecordToInsert,
  preventivoRecordToUpdate,
  preventivoRowToRecord,
} from "@/lib/preventivi/preventivi-db-mapper";
import {
  appendPreventivo as appendLocal,
  deletePreventivo as deleteLocal,
  upsertPreventivo as upsertLocal,
} from "@/lib/preventivi/preventivi-storage";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { lavorazioneListRowToAttiva } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { lavorazioneMatchesMezzo, normMezzoKey } from "@/lib/mezzi/lavorazioni-sync";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { mezzoGestitoToEmbedRow } from "@/lib/mezzi/mezzi-attrezzature-batch";
import { findMezzoForLavorazione } from "@/lib/schede/schede-autofill";
import {
  cabSyncEventForEntity,
  dispatchGestionaleLocalMutation,
} from "@/lib/sync/gestionale-sync-dispatch";
import { preventiviService } from "@/src/services/preventivi.service";
import type { PreventiviFilters } from "@/src/services/preventivi.service";
import { lavorazioniService, type LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { PreventivoRow } from "@/src/types/supabase-tables";

export const PREVENTIVI_CONCURRENCY_CONFLICT =
  "Un altro utente ha aggiornato questo preventivo. Ricarica e riprova.";

export type PreventivoPersistOptions = {
  expectedUpdatedAt?: string;
  skipDb?: boolean;
  queryClient?: QueryClient;
  skipDispatch?: boolean;
};

export type PreventivoRemoveOptions = {
  queryClient?: QueryClient;
  skipDispatch?: boolean;
};

function notifyPreventiviMutation(
  qc: QueryClient | undefined,
  id: string,
  type: "entity_created" | "entity_updated" | "entity_deleted",
  skipDispatch?: boolean,
): void {
  if (!qc || skipDispatch) return;
  dispatchGestionaleLocalMutation(qc, ["preventivi"], [
    cabSyncEventForEntity("preventivi", id, type, "preventivi"),
  ]);
}

async function resolveMezzoIdForRecord(
  record: PreventivoRecord,
  mezziGestiti: readonly MezzoGestito[],
): Promise<string | null> {
  const stored = (record as unknown as { mezzoId?: string }).mezzoId;
  if (typeof stored === "string" && isPreventivoUuid(stored)) return stored;

  if (isPreventivoUuid(record.lavorazioneId)) {
    const lavRes = await lavorazioniService.getById(record.lavorazioneId);
    if (lavRes.success && lavRes.data) {
      const row = lavRes.data;
      if (row.mezzo_id && isPreventivoUuid(row.mezzo_id)) return row.mezzo_id;
      const mezzoEmbed = mezziGestiti.find((m) => m.id === row.mezzo_id);
      const mezzoRow = mezzoEmbed ? mezzoGestitoToEmbedRow(mezzoEmbed) : null;
      const listRow = { ...row, mezzo: mezzoRow } as LavorazioneListRow;
      const lav = lavorazioneListRowToAttiva(listRow);
      const m = findMezzoForLavorazione([...mezziGestiti], lav);
      if (m?.id && isPreventivoUuid(m.id)) return m.id;
      const hit = mezziGestiti.find((g) => lavorazioneMatchesMezzo(g, lav));
      if (hit?.id && isPreventivoUuid(hit.id)) return hit.id;
    }
  }

  const clienteKey = normMezzoKey(record.cliente);
  if (clienteKey) {
    const byCliente = mezziGestiti.find((m) => normMezzoKey(m.cliente) === clienteKey);
    if (byCliente?.id) return byCliente.id;
  }

  return null;
}

function rowMatchesExistingRecord(row: PreventivoRow, record: PreventivoRecord, mezzoId: string): boolean {
  const det = row.dettagli as Record<string, unknown> | undefined;
  if (typeof det?.localLegacyId === "string" && det.localLegacyId === record.id) return true;
  const detNum = typeof det?.numero === "string" ? det.numero.trim() : "";
  if (!detNum || detNum !== record.numero.trim()) return false;
  if (row.mezzo_id !== mezzoId) return false;
  if (isPreventivoUuid(record.lavorazioneId)) {
    return row.lavorazione_id === record.lavorazioneId;
  }
  return !row.lavorazione_id;
}

async function resolveExistingPreventivoRow(
  record: PreventivoRecord,
  mezzoId: string,
): Promise<{ row: PreventivoRow | null; lookupError?: string }> {
  if (isPreventivoUuid(record.id)) {
    const byId = await preventiviService.getById(record.id);
    if (byId.success && byId.data) return { row: byId.data };
    if (byId.success === false && byId.error && byId.error !== "Preventivo non trovato") {
      return { row: null, lookupError: byId.error };
    }
  }

  const filters: PreventiviFilters = {};
  if (isPreventivoUuid(record.lavorazioneId)) filters.lavorazione_id = record.lavorazioneId;
  else if (record.cliente.trim()) filters.cliente = record.cliente.trim();

  const list = await preventiviService.getAll(Object.keys(filters).length ? filters : undefined);
  if (!list.success) {
    return { row: null, lookupError: list.error ?? "Impossibile verificare il preventivo." };
  }

  const hit = (list.data ?? []).find((row) => rowMatchesExistingRecord(row, record, mezzoId)) ?? null;
  return { row: hit };
}

function mezzoEmbedForId(mezziGestiti: readonly MezzoGestito[], mezzoId: string) {
  const g = mezziGestiti.find((m) => m.id === mezzoId);
  return g ? mezzoGestitoToEmbedRow(g) : null;
}

async function syncRecordToDb(
  record: PreventivoRecord,
  mezziGestiti: readonly MezzoGestito[],
  expectedUpdatedAt?: string,
): Promise<
  | { ok: true; record: PreventivoRecord; legacyId?: string; created: boolean }
  | { ok: false; error: string }
> {
  const legacyId = !isPreventivoUuid(record.id) ? record.id : undefined;
  const mezzoId = await resolveMezzoIdForRecord(record, mezziGestiti);
  if (!mezzoId) {
    return { ok: false, error: "Mezzo non trovato per il cliente/lavorazione indicati." };
  }

  const existing = await resolveExistingPreventivoRow(record, mezzoId);
  if (existing.lookupError) {
    return { ok: false, error: existing.lookupError };
  }

  if (existing.row) {
    const updPayload = preventivoRecordToUpdate(
      record,
      mezzoId,
      expectedUpdatedAt ?? existing.row.updated_at,
    );
    const prevDet = existing.row.dettagli as Record<string, unknown> | undefined;
    const legacy = typeof prevDet?.localLegacyId === "string" ? prevDet.localLegacyId : undefined;
    if (legacy && updPayload.dettagli && typeof updPayload.dettagli === "object") {
      updPayload.dettagli = { ...(updPayload.dettagli as Record<string, unknown>), localLegacyId: legacy };
    }
    const upd = await preventiviService.update(existing.row.id, updPayload);
    if (!upd.success) {
      if (upd.error?.includes("0 rows") || upd.error?.includes("PGRST116")) {
        return { ok: false, error: PREVENTIVI_CONCURRENCY_CONFLICT };
      }
      return { ok: false, error: upd.error ?? "Aggiornamento fallito." };
    }
    if (!upd.data) return { ok: false, error: "Aggiornamento fallito." };
    return {
      ok: true,
      record: preventivoRowToRecord(upd.data, mezzoEmbedForId(mezziGestiti, mezzoId)),
      legacyId,
      created: false,
    };
  }

  const ins = await preventiviService.create(preventivoRecordToInsert(record, mezzoId));
  if (!ins.success || !ins.data) return { ok: false, error: ins.error ?? "Creazione fallito." };
  const synced = preventivoRowToRecord(ins.data, mezzoEmbedForId(mezziGestiti, mezzoId));
  return { ok: true, record: synced, legacyId, created: true };
}

function mirrorLocalLegacy(record: PreventivoRecord): void {
  upsertLocal(record);
}

export async function persistPreventivoRecord(
  record: PreventivoRecord,
  mezziGestiti: readonly MezzoGestito[],
  options?: PreventivoPersistOptions,
): Promise<{ ok: true; record: PreventivoRecord } | { ok: false; error: string }> {
  const hydrated = { ...record, aggiornatoAt: new Date().toISOString() };

  if (!options?.skipDb) {
    const db = await syncRecordToDb(hydrated, mezziGestiti, options?.expectedUpdatedAt);
    if (db.ok) {
      notifyPreventiviMutation(
        options?.queryClient,
        db.record.id,
        db.created ? "entity_created" : "entity_updated",
        options?.skipDispatch,
      );
      return { ok: true, record: db.record };
    }
    if (isPreventiviDbPrimary()) return db;
  }

  if (isPreventiviDbPrimary()) {
    return { ok: false, error: "Salvataggio preventivo non riuscito." };
  }

  mirrorLocalLegacy(hydrated);
  notifyPreventiviMutation(options?.queryClient, hydrated.id, "entity_updated", options?.skipDispatch);
  return { ok: true, record: hydrated };
}

export async function appendPreventivoSynced(
  record: PreventivoRecord,
  mezziGestiti: readonly MezzoGestito[],
  options?: PreventivoPersistOptions,
): Promise<{ ok: true; record: PreventivoRecord } | { ok: false; error: string }> {
  return persistPreventivoRecord(record, mezziGestiti, options);
}

export async function removePreventivoRecord(
  id: string,
  options?: PreventivoRemoveOptions,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isPreventivoUuid(id)) {
    const del = await preventiviService.remove(id);
    if (!del.success && isPreventiviDbPrimary()) {
      return { ok: false, error: del.error ?? "Eliminazione fallita." };
    }
    if (del.success) {
      notifyPreventiviMutation(options?.queryClient, id, "entity_deleted", options?.skipDispatch);
      return { ok: true };
    }
  }

  if (isPreventiviDbPrimary()) {
    return { ok: false, error: "Eliminazione preventivo non riuscita." };
  }

  deleteLocal(id);
  notifyPreventiviMutation(options?.queryClient, id, "entity_deleted", options?.skipDispatch);
  return { ok: true };
}
