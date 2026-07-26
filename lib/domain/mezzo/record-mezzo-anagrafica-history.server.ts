import type { SupabaseClient } from "@supabase/supabase-js";
import {
  diffMezzoAnagraficaHistory,
  type MezzoAnagraficaHistoryOrigine,
  type MezzoAnagraficaHistoryEventKind,
} from "@/lib/domain/mezzo/record-mezzo-anagrafica-change";

export type RecordMezzoAnagraficaHistoryInput = {
  mezzoId: string;
  origine: MezzoAnagraficaHistoryOrigine;
  oldValues: Record<string, string>;
  newValues: Record<string, string>;
  lavorazioneId?: string | null;
  schedaId?: string | null;
  userId?: string | null;
  eventKind?: MezzoAnagraficaHistoryEventKind;
  reason?: string | null;
};

/** Server SSOT: ricalcola sempre changed_fields — ignora eventuali campi client. */
export async function recordMezzoAnagraficaHistoryServer(
  sb: SupabaseClient,
  input: RecordMezzoAnagraficaHistoryInput,
): Promise<{ id: string; created_at: string } | null> {
  const diff = diffMezzoAnagraficaHistory(input.oldValues, input.newValues);
  if (diff.changed_fields.length === 0) return null;

  const { data, error } = await sb
    .from("mezzo_anagrafica_history")
    .insert({
      mezzo_id: input.mezzoId,
      lavorazione_id: input.lavorazioneId ?? null,
      scheda_id: input.schedaId ?? null,
      user_id: input.userId ?? null,
      origine: input.origine,
      changed_fields: diff.changed_fields,
      old_values: diff.old_values,
      new_values: diff.new_values,
      event_kind: input.eventKind ?? "anagrafica_change",
      reason: input.reason ?? null,
    })
    .select("id, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
