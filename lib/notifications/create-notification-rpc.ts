import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateNotificationInput, CreateNotificationResult } from "@/lib/notifications/notification-types";

export async function createNotificationRpc(
  client: SupabaseClient,
  input: CreateNotificationInput,
): Promise<CreateNotificationResult> {
  const { data, error } = await client.rpc("cab_create_notification", {
    p_type: input.type,
    p_title: input.title,
    p_body: input.body,
    p_href: input.href ?? null,
    p_entity_type: input.entity_type ?? null,
    p_entity_id: input.entity_id ?? null,
    p_dedup_key: input.dedup_key,
  });
  if (error) {
    console.warn("[notifications] create RPC failed:", error.message);
    return { id: null, inserted: false };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    console.warn("[notifications] create RPC invalid response");
    return { id: null, inserted: false };
  }
  const r = row as { id?: string | null; inserted?: boolean };
  return { id: r.id ?? null, inserted: Boolean(r.inserted) };
}
