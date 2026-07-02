import "server-only";

import {
  captureEventIdempotencyKey,
  type CaptureEventType,
} from "@/lib/document-capture/capture-event-idempotency";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type MutateCaptureWithEventInput = {
  captureId: string;
  eventType: CaptureEventType;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
  newStatus?: string | null;
  lavorazioneId?: string | null;
  mezzoId?: string | null;
  attrezzaturaId?: string | null;
};

export async function mutateCaptureWithEvent(input: MutateCaptureWithEventInput): Promise<void> {
  const sb = await createSupabaseServerUserClient();
  const idempotencyKey =
    input.idempotencyKey ??
    captureEventIdempotencyKey(input.eventType, {
      captureId: input.captureId,
      applicationId: typeof input.payload?.applicationId === "string" ? input.payload.applicationId : undefined,
      captureVersion: typeof input.payload?.captureVersion === "number" ? input.payload.captureVersion : undefined,
    });

  const { error } = await sb.rpc("document_capture_mutate_with_event", {
    p_capture_id: input.captureId,
    p_event_type: input.eventType,
    p_idempotency_key: idempotencyKey,
    p_payload: input.payload ?? {},
    p_new_status: input.newStatus ?? null,
    p_lavorazione_id: input.lavorazioneId ?? null,
    p_mezzo_id: input.mezzoId ?? null,
    p_attrezzatura_id: input.attrezzaturaId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
