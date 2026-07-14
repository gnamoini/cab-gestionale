import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LabelEventType } from "@/lib/inventory-labels/domain/types";

export type WriteLabelEventInput = {
  eventType: LabelEventType;
  entityType: string;
  entityId: string;
  userId?: string | null;
  device?: string | null;
  payload?: Record<string, unknown>;
};

export async function writeInventoryLabelEvent(
  sb: SupabaseClient,
  input: WriteLabelEventInput,
): Promise<void> {
  const { error } = await sb.from("inventory_label_events").insert({
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    user_id: input.userId ?? null,
    device: input.device ?? null,
    payload: input.payload ?? {},
  });
  if (error) {
    console.error("[inventory-label-event] write failed", {
      eventType: input.eventType,
      message: error.message,
    });
  }
}
