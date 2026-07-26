import { MEZZI_COLUMNS } from "@/lib/db/table-select-columns";
import {
  associationSnapshotToMezzoPatch,
  checkAssociationChange,
  deriveEventKind,
  type AssociationSnapshot,
} from "@/lib/domain/mezzo/mezzo-association";
import { mezzoGestitoToAnagraficaSnapshot } from "@/lib/domain/mezzo/mezzo-anagrafica-snapshot";
import { isMezzoUpdatedAtStale } from "@/lib/domain/mezzo/mezzo-occ";
import type { MezzoAnagraficaHistoryOrigine } from "@/lib/domain/mezzo/record-mezzo-anagrafica-change";
import { recordMezzoAnagraficaHistoryServer } from "@/lib/domain/mezzo/record-mezzo-anagrafica-history.server";
import { mergeMezzoMetaPatch, parseMezzoMeta } from "@/lib/mezzi/mezzi-meta";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { auditContext, auditDiff, writeModificaLog } from "@/src/services/internal/audit-log";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MezzoUpdate } from "@/src/services/mezzi.service";

export type ApplyAssociationChangeInput = {
  mezzoId: string;
  existingMezzo: MezzoGestito;
  newAssociation: AssociationSnapshot;
  origin: MezzoAnagraficaHistoryOrigine;
  reason?: string | null;
  lavorazioneId?: string | null;
  schedaId?: string | null;
  expectedUpdatedAt: string;
  changedBy?: string | null;
};

export type ApplyAssociationChangeResult =
  | { ok: true; row: MezzoRow; historyId: string | null; noOp: boolean }
  | { ok: false; code: "STALE_CONFLICT" | "VALIDATION" | "NOT_FOUND"; message: string };

function oggettoMezzo(r: MezzoRow) {
  const ident = r.targa?.trim() || "";
  const parts = [r.cliente?.trim(), ident].filter(Boolean);
  return parts.length ? auditContext(parts.join(" — ")) : undefined;
}

function buildAssociationPatch(existing: MezzoRow, snapshot: AssociationSnapshot): MezzoUpdate {
  const base = associationSnapshotToMezzoPatch(snapshot);
  const meta = parseMezzoMeta(existing.meta);
  const mergedMeta = mergeMezzoMetaPatch(meta, {
    cantiere: snapshot.cantiere.trim() || undefined,
  });
  return {
    ...base,
    cliente: snapshot.cliente.trim() || existing.cliente,
    utilizzatore: snapshot.utilizzatore.trim() || null,
    meta: mergedMeta as Record<string, unknown>,
  };
}

export async function applyAssociationChangeDb(
  sb: SupabaseClient,
  input: ApplyAssociationChangeInput,
): Promise<ApplyAssociationChangeResult> {
  const change = checkAssociationChange({
    existingMezzo: input.existingMezzo,
    incoming: input.newAssociation,
  });

  if (!change.hasChanges) {
    const { data: row, error } = await sb
      .from("mezzi")
      .select(MEZZI_COLUMNS)
      .eq("id", input.mezzoId)
      .maybeSingle();
    if (error) return { ok: false, code: "VALIDATION", message: error.message };
    if (!row) return { ok: false, code: "NOT_FOUND", message: "Mezzo non trovato." };
    return { ok: true, row: row as MezzoRow, historyId: null, noOp: true };
  }

  const liveUpdatedAt = input.existingMezzo.ultimaModifica?.trim() ?? "";
  if (
    input.expectedUpdatedAt.trim() &&
    liveUpdatedAt &&
    isMezzoUpdatedAtStale(input.expectedUpdatedAt, liveUpdatedAt)
  ) {
    return {
      ok: false,
      code: "STALE_CONFLICT",
      message: "Il mezzo è stato modificato da un altro utente. Ricarica e riprova.",
    };
  }

  const { data: before, error: e0 } = await sb
    .from("mezzi")
    .select(MEZZI_COLUMNS)
    .eq("id", input.mezzoId)
    .maybeSingle();
  if (e0) return { ok: false, code: "VALIDATION", message: e0.message };
  if (!before) return { ok: false, code: "NOT_FOUND", message: "Mezzo non trovato." };

  const patch = buildAssociationPatch(before as MezzoRow, input.newAssociation);
  const { data: row, error } = await sb
    .from("mezzi")
    .update(patch)
    .eq("id", input.mezzoId)
    .select(MEZZI_COLUMNS)
    .single();
  if (error) return { ok: false, code: "VALIDATION", message: error.message };

  const r = row as MezzoRow;
  await writeModificaLog(sb, {
    entita: "mezzi",
    entita_id: input.mezzoId,
    azione: "UPDATE",
    payload: auditDiff(before, r, oggettoMezzo(r)),
  });

  const oldSnap = mezzoGestitoToAnagraficaSnapshot(input.existingMezzo);
  const newSnap = mezzoGestitoToAnagraficaSnapshot({
    ...input.existingMezzo,
    cliente: input.newAssociation.cliente.trim() || input.existingMezzo.cliente,
    cantiere: input.newAssociation.cantiere.trim(),
    utilizzatore: input.newAssociation.utilizzatore.trim(),
  });

  const historyOld: Record<string, string> = {};
  const historyNew: Record<string, string> = {};
  for (const key of change.changedFields) {
    historyOld[key] = oldSnap[key] ?? "";
    historyNew[key] = newSnap[key] ?? "";
  }

  const historyRow = await recordMezzoAnagraficaHistoryServer(sb, {
    mezzoId: input.mezzoId,
    origine: input.origin,
    oldValues: historyOld,
    newValues: historyNew,
    lavorazioneId: input.lavorazioneId,
    schedaId: input.schedaId,
    userId: input.changedBy,
    eventKind: deriveEventKind(change.changedFields),
    reason: input.reason?.trim() || null,
  });

  return { ok: true, row: r, historyId: historyRow?.id ?? null, noOp: false };
}
