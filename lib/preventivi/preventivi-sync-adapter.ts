"use client";

import { isPreventiviDbPrimary } from "@/lib/preventivi/preventivi-db-primary";
import {
  isPreventivoUuid,
  mergePreventivoRecords,
  preventivoRecordToInsert,
  preventivoRecordToUpdate,
  preventivoRowToRecord,
} from "@/lib/preventivi/preventivi-db-mapper";
import {
  appendPreventivo as appendLocal,
  deletePreventivo as deleteLocal,
  loadPreventivi,
  upsertPreventivo as upsertLocal,
} from "@/lib/preventivi/preventivi-storage";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { lavorazioneMatchesMezzo, normMezzoKey } from "@/lib/mezzi/lavorazioni-sync";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { getLavorazioniMezziSnapshot } from "@/lib/mezzi/lavorazioni-sync";
import { findMezzoForLavorazione } from "@/lib/schede/schede-autofill";
import { dispatchPreventiviRefresh } from "@/lib/sistema/cab-events";
import { preventiviService } from "@/src/services/preventivi.service";
import type { PreventiviFilters } from "@/src/services/preventivi.service";
import type { MezzoRow, PreventivoRow } from "@/src/types/supabase-tables";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";

export const PREVENTIVI_CONCURRENCY_CONFLICT =
  "Un altro utente ha aggiornato questo preventivo. Ricarica e riprova.";

function resolveMezzoIdForRecord(
  record: PreventivoRecord,
  mezziRows: readonly MezzoRow[],
): string | null {
  const det = record as PreventivoRecord & { mezzoId?: string };
  const stored = (record as unknown as { mezzoId?: string }).mezzoId;
  if (typeof stored === "string" && isPreventivoUuid(stored)) return stored;

  const gestiti: MezzoGestito[] = mezziRows.map((r) => toMezzoUI(r));
  const snap = getLavorazioniMezziSnapshot();
  const lav =
    snap.attive.find((l) => l.id === record.lavorazioneId) ??
    snap.storico.find((l) => l.id === record.lavorazioneId);
  if (lav) {
    const m = findMezzoForLavorazione(gestiti, lav);
    if (m?.id && isPreventivoUuid(m.id)) return m.id;
    const hit = gestiti.find((g) => lavorazioneMatchesMezzo(g, lav));
    if (hit?.id && isPreventivoUuid(hit.id)) return hit.id;
  }

  const clienteKey = normMezzoKey(record.cliente);
  if (clienteKey) {
    const byCliente = mezziRows.find((m) => normMezzoKey(m.cliente) === clienteKey);
    if (byCliente?.id) return byCliente.id;
  }

  if (mezziRows.length > 0) return mezziRows[0]!.id;
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

async function syncRecordToDb(
  record: PreventivoRecord,
  mezziRows: readonly MezzoRow[],
  expectedUpdatedAt?: string,
): Promise<{ ok: true; record: PreventivoRecord; legacyId?: string } | { ok: false; error: string }> {
  const legacyId = !isPreventivoUuid(record.id) ? record.id : undefined;
  const mezzoId = resolveMezzoIdForRecord(record, mezziRows);
  if (!mezzoId) {
    return { ok: false, error: "Mezzo non trovato per sincronizzare il preventivo." };
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
      record: preventivoRowToRecord(upd.data, mezziRows.find((m) => m.id === mezzoId) ?? null),
      legacyId,
    };
  }

  const ins = await preventiviService.create(preventivoRecordToInsert(record, mezzoId));
  if (!ins.success || !ins.data) return { ok: false, error: ins.error ?? "Creazione fallito." };
  const synced = preventivoRowToRecord(ins.data, mezziRows.find((m) => m.id === mezzoId) ?? null);
  return { ok: true, record: synced, legacyId };
}

function mirrorLocal(record: PreventivoRecord, legacyId?: string): void {
  upsertLocal(record);
  const toDelete = new Set<string>();
  if (legacyId && legacyId !== record.id) toDelete.add(legacyId);
  if (isPreventivoUuid(record.id)) {
    const numero = record.numero.trim();
    if (numero) {
      for (const ghost of loadPreventivi()) {
        if (ghost.id === record.id) continue;
        if (!isPreventivoUuid(ghost.id) && ghost.numero.trim() === numero) {
          toDelete.add(ghost.id);
        }
      }
    }
  }
  for (const id of toDelete) deleteLocal(id);
}

export async function persistPreventivoRecord(
  record: PreventivoRecord,
  mezziRows: readonly MezzoRow[],
  options?: { expectedUpdatedAt?: string; skipDb?: boolean },
): Promise<{ ok: true; record: PreventivoRecord } | { ok: false; error: string }> {
  const hydrated = { ...record, aggiornatoAt: new Date().toISOString() };

  if (!options?.skipDb) {
    const db = await syncRecordToDb(hydrated, mezziRows, options?.expectedUpdatedAt);
    if (db.ok) {
      mirrorLocal(db.record, db.legacyId);
      dispatchPreventiviRefresh();
      return { ok: true, record: db.record };
    }
    if (isPreventiviDbPrimary()) return db;
  }

  mirrorLocal(hydrated);
  dispatchPreventiviRefresh();
  return { ok: true, record: hydrated };
}

export async function appendPreventivoSynced(
  record: PreventivoRecord,
  mezziRows: readonly MezzoRow[],
): Promise<{ ok: true; record: PreventivoRecord } | { ok: false; error: string }> {
  const res = await persistPreventivoRecord(record, mezziRows);
  if (res.ok && !loadPreventivi().some((p) => p.id === res.record.id)) {
    appendLocal(res.record);
  }
  return res;
}

export async function removePreventivoRecord(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isPreventivoUuid(id)) {
    const del = await preventiviService.remove(id);
    if (!del.success && isPreventiviDbPrimary()) {
      return { ok: false, error: del.error ?? "Eliminazione fallita." };
    }
  }
  deleteLocal(id);
  dispatchPreventiviRefresh();
  return { ok: true };
}

export function mergeLoadedPreventivi(
  local: readonly PreventivoRecord[],
  remote: readonly PreventivoRow[] | undefined,
  mezziRows: readonly MezzoRow[],
): PreventivoRecord[] {
  const mezziById = new Map(mezziRows.map((m) => [m.id, m]));
  return mergePreventivoRecords(local, remote ?? [], mezziById, isPreventiviDbPrimary());
}
