"use client";

import {
  diffMezzoAnagraficaHistory,
  type MezzoAnagraficaHistoryInsert,
  type MezzoAnagraficaHistoryOrigine,
} from "@/lib/domain/mezzo/record-mezzo-anagrafica-change";
import { recordMezzoAnagraficaHistoryServer } from "@/lib/domain/mezzo/record-mezzo-anagrafica-history.server";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";

export type MezzoAnagraficaHistoryRow = MezzoAnagraficaHistoryInsert & {
  id: string;
  created_at: string;
};

export async function recordMezzoAnagraficaDiff(input: {
  mezzoId: string;
  origine: MezzoAnagraficaHistoryOrigine;
  oldValues: Record<string, string>;
  newValues: Record<string, string>;
  lavorazioneId?: string | null;
  schedaId?: string | null;
  userId?: string | null;
}): Promise<ServiceResult<MezzoAnagraficaHistoryRow | null>> {
  try {
    const sb = getBrowserSupabase();
    const row = await recordMezzoAnagraficaHistoryServer(sb, {
      mezzoId: input.mezzoId,
      origine: input.origine,
      oldValues: input.oldValues,
      newValues: input.newValues,
      lavorazioneId: input.lavorazioneId,
      schedaId: input.schedaId,
      userId: input.userId,
    });
    if (!row) return success(null);
    const diff = diffMezzoAnagraficaHistory(input.oldValues, input.newValues);
    return success({
      mezzo_id: input.mezzoId,
      origine: input.origine,
      changed_fields: diff.changed_fields,
      old_values: diff.old_values,
      new_values: diff.new_values,
      lavorazione_id: input.lavorazioneId,
      scheda_id: input.schedaId,
      user_id: input.userId,
      id: row.id,
      created_at: row.created_at,
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore storico anagrafica mezzo.");
  }
}

export async function fetchMezzoAnagraficaHistory(
  mezzoId: string,
  limit = 20,
): Promise<ServiceResult<MezzoAnagraficaHistoryRow[]>> {
  const id = mezzoId.trim();
  if (!id) return success([]);
  try {
    const sb = getBrowserSupabase();
    const { data, error } = await sb
      .from("mezzo_anagrafica_history")
      .select(
        "id, mezzo_id, lavorazione_id, scheda_id, user_id, origine, changed_fields, old_values, new_values, created_at",
      )
      .eq("mezzo_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return err(error.message);
    return success((data ?? []) as MezzoAnagraficaHistoryRow[]);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Errore caricamento storico anagrafica.");
  }
}
