import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { MEZZO_LABEL_ENTITY_TYPE, type MezzoLabelEventType } from "@/lib/mezzo-labels/domain/types";

export type WriteMezzoLabelEventInput = {
  eventType: MezzoLabelEventType;
  mezzoId: string;
  userId?: string | null;
  device?: string | null;
  payload?: Record<string, unknown>;
};

export async function writeMezzoLabelEvent(
  sb: SupabaseClient,
  input: WriteMezzoLabelEventInput,
): Promise<void> {
  const { error } = await sb.from("inventory_label_events").insert({
    event_type: input.eventType,
    entity_type: MEZZO_LABEL_ENTITY_TYPE,
    entity_id: input.mezzoId,
    user_id: input.userId ?? null,
    device: input.device ?? null,
    payload: input.payload ?? {},
  });
  if (error) {
    console.error("[mezzo-label-event] write failed", {
      eventType: input.eventType,
      message: error.message,
    });
  }
}
