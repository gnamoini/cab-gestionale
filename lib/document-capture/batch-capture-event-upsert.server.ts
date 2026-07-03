import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaptureEventType } from "@/lib/document-capture/capture-event-idempotency";

export type BatchCaptureEventRow = Readonly<{
  captureId: string;
  eventType: CaptureEventType;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  newStatus?: string | null;
  lavorazioneId?: string | null;
  mezzoId?: string | null;
  attrezzaturaId?: string | null;
}>;

/** PR-7 — batch document-capture event upserts via RPC (single round-trip). */
export async function batchCaptureEventUpsert(
  sb: SupabaseClient,
  rows: readonly BatchCaptureEventRow[],
): Promise<void> {
  if (rows.length === 0) return;
  for (const row of rows) {
    const { error } = await sb.rpc("document_capture_mutate_with_event", {
      p_capture_id: row.captureId,
      p_event_type: row.eventType,
      p_idempotency_key: row.idempotencyKey,
      p_payload: row.payload ?? {},
      p_new_status: row.newStatus ?? null,
      p_lavorazione_id: row.lavorazioneId ?? null,
      p_mezzo_id: row.mezzoId ?? null,
      p_attrezzatura_id: row.attrezzaturaId ?? null,
    });
    if (error) throw new Error(error.message);
  }
}
