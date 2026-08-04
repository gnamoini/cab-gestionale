import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ResendWebhookEvent = {
  type: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
  };
};

export async function handleResendWebhookEvent(
  client: SupabaseClient,
  event: ResendWebhookEvent,
): Promise<{ ok: boolean; updated?: boolean }> {
  const messageId = event.data?.email_id;
  if (!messageId) return { ok: true, updated: false };

  let status: string | null = null;
  switch (event.type) {
    case "email.sent":
      status = "sent";
      break;
    case "email.delivered":
      status = "delivered";
      break;
    case "email.bounced":
      status = "bounced";
      break;
    case "email.complained":
      status = "failed";
      break;
    default:
      return { ok: true, updated: false };
  }

  const { data: log } = await client
    .from("communication_log")
    .select("id, status")
    .eq("message_id", messageId)
    .maybeSingle();

  if (!log) return { ok: true, updated: false };

  if (status === "sent" && log.status !== "pending") {
    return { ok: true, updated: false };
  }

  await client
    .from("communication_log")
    .update({
      status,
      error_message: status === "bounced" || status === "failed" ? event.type : null,
    })
    .eq("id", log.id);

  return { ok: true, updated: true };
}
