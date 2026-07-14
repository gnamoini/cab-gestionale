import "server-only";

import webpush from "web-push";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { assertSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { buildPushNotificationPayload } from "@/lib/pwa/push-payload";
import type { ProcessPushDeliveryResult } from "@/lib/pwa/push-send";

type NotificationRow = {
  id: string;
  type: string;
  scope_type: "user" | "role" | "global";
  scope_value: string | null;
  title: string;
  body: string;
  href: string | null;
  dedup_key: string;
  entity_id: string | null;
};

type DeliveryRow = {
  id: string;
  notification_id: string;
  attempts: number;
  max_attempts: number;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  company_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const STAFF_ROLES = ["admin", "manager", "operatore", "addetto_amministrativo"] as const;

function isPushDeliveryEnabled(): boolean {
  const raw = process.env.PWA_PUSH_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

function getVapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
    ?? process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:service@autocompattatori.it";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function createPushAdminClient(): SupabaseClient {
  const serviceKey = assertSupabaseServiceRoleKey();
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveRecipientUserIds(
  client: SupabaseClient,
  notification: NotificationRow,
): Promise<string[]> {
  if (notification.scope_type === "user" && notification.scope_value) {
    return [notification.scope_value];
  }

  if (notification.scope_type === "role" && notification.scope_value) {
    const { data, error } = await client
      .from("profiles")
      .select("id")
      .eq("role", notification.scope_value);
    if (error || !data) return [];
    return data.map((row) => row.id as string);
  }

  const { data, error } = await client
    .from("profiles")
    .select("id")
    .in("role", [...STAFF_ROLES]);
  if (error || !data) return [];
  return data.map((row) => row.id as string);
}

async function loadActiveSubscriptions(
  client: SupabaseClient,
  userIds: string[],
): Promise<PushSubscriptionRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await client
    .from("push_subscriptions")
    .select("id, user_id, company_id, endpoint, p256dh, auth")
    .in("user_id", userIds)
    .is("revoked_at", null);
  if (error || !data) return [];
  return data as PushSubscriptionRow[];
}

async function revokeSubscription(
  client: SupabaseClient,
  companyId: string,
  endpoint: string,
): Promise<void> {
  await client
    .from("push_subscriptions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("endpoint", endpoint)
    .is("revoked_at", null);
}

async function completeDelivery(
  client: SupabaseClient,
  deliveryId: string,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  await client.rpc("cab_complete_push_delivery", {
    p_delivery_id: deliveryId,
    p_success: success,
    p_error: errorMessage ?? null,
    p_retry_delay_seconds: 60,
  });
}

async function processDelivery(
  client: SupabaseClient,
  delivery: DeliveryRow,
  vapid: { publicKey: string; privateKey: string; subject: string },
): Promise<void> {
  const { data: notification, error: notificationError } = await client
    .from("notifications")
    .select("id, type, scope_type, scope_value, title, body, href, dedup_key, entity_id")
    .eq("id", delivery.notification_id)
    .maybeSingle();

  if (notificationError || !notification) {
    await completeDelivery(client, delivery.id, false, notificationError?.message ?? "notification_missing");
    return;
  }

  const row = notification as NotificationRow;
  const userIds = await resolveRecipientUserIds(client, row);
  const subscriptions = await loadActiveSubscriptions(client, userIds);
  if (subscriptions.length === 0) {
    await completeDelivery(client, delivery.id, true);
    return;
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const payload = JSON.stringify(
    buildPushNotificationPayload({
      notificationId: row.id,
      title: row.title,
      body: row.body,
      href: row.href,
      dedup_key: row.dedup_key,
      type: row.type,
      entity_id: row.entity_id,
    }),
  );

  let sent = 0;
  let lastError: string | null = null;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await revokeSubscription(client, sub.company_id, sub.endpoint);
        continue;
      }
      lastError = error instanceof Error ? error.message : "push_send_failed";
    }
  }

  if (sent > 0) {
    await completeDelivery(client, delivery.id, true);
    return;
  }

  await completeDelivery(client, delivery.id, false, lastError ?? "no_recipients_sent");
}

/** Claim batch + invio push lato Vercel (VAPID da env server). */
export async function runPushDeliveryProcess(input?: {
  limit?: number;
}): Promise<ProcessPushDeliveryResult> {
  if (!isPushDeliveryEnabled()) {
    return { ok: true, skipped: "push_disabled" };
  }

  const vapid = getVapidConfig();
  if (!vapid) {
    return { ok: false, error: "vapid_not_configured" };
  }

  const client = createPushAdminClient();
  const limit = input?.limit ?? 20;

  const { data: claimed, error: claimError } = await client.rpc("cab_claim_push_delivery_batch", {
    p_limit: limit,
  });

  if (claimError) {
    return { ok: false, error: claimError.message };
  }

  const deliveries = (claimed ?? []) as DeliveryRow[];
  for (const delivery of deliveries) {
    await processDelivery(client, delivery, vapid);
  }

  return { ok: true, processed: deliveries.length };
}
