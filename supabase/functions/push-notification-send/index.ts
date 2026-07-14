import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

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

function resolveNotificationHref(notification: NotificationRow): string {
  const entityId = notification.entity_id?.trim() || null;
  const type = notification.type;
  if (type === "lavorazione_created" || type === "lavorazione_completata") {
    return entityId ? `/lavorazioni?focusLav=${encodeURIComponent(entityId)}` : "/lavorazioni";
  }
  if (type === "client_portal_ingresso" || type === "client_portal_completata") {
    return entityId ? `/lavorazioni-clienti/${encodeURIComponent(entityId)}` : "/lavorazioni-clienti";
  }
  if (type === "magazzino_sotto_scorta") {
    return entityId ? `/magazzino?focusRicambio=${encodeURIComponent(entityId)}` : "/magazzino";
  }
  if (type === "fatture_scadute_digest") return "/fatturazione?scadenzaPreset=scadute";
  if (type === "dipendenti_presenze_reminder") return "/dipendenti";
  if (type === "tagliando_da_eseguire") return "/mezzi";
  const stored = notification.href?.trim();
  if (stored) return stored.startsWith("/") ? stored : `/${stored}`;
  return "/dashboard";
}

function buildPushPayload(notification: NotificationRow) {
  return {
    title: notification.title.trim() || "CAB Gestionale",
    body: notification.body.trim() || "Nuova notifica",
    icon: "/icons/icon-192x192.png",
    tag: notification.dedup_key.trim() || notification.type,
    href: resolveNotificationHref(notification),
    notificationId: notification.id,
    type: notification.type,
  };
}

function isPushEnabled(): boolean {
  const raw = Deno.env.get("PWA_PUSH_ENABLED")?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  return false;
}

function getVapidConfig() {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")?.trim()
    ?? Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY")?.trim();
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")?.trim();
  const subject = Deno.env.get("VAPID_SUBJECT")?.trim() || "mailto:support@cab.local";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function createServiceClient() {
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function resolveRecipientUserIds(
  client: ReturnType<typeof createClient>,
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
    .in("role", STAFF_ROLES);
  if (error || !data) return [];
  return data.map((row) => row.id as string);
}

async function loadActiveSubscriptions(
  client: ReturnType<typeof createClient>,
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
  client: ReturnType<typeof createClient>,
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
  client: ReturnType<typeof createClient>,
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
  client: ReturnType<typeof createClient>,
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

  const userIds = await resolveRecipientUserIds(client, notification as NotificationRow);
  const subscriptions = await loadActiveSubscriptions(client, userIds);
  if (subscriptions.length === 0) {
    await completeDelivery(client, delivery.id, true);
    return;
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const payload = JSON.stringify(buildPushPayload(notification as NotificationRow));

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

Deno.serve(async (req) => {
  if (!isPushEnabled()) {
    return new Response(JSON.stringify({ ok: true, skipped: "push_disabled" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const vapid = getVapidConfig();
  if (!vapid) {
    return new Response(JSON.stringify({ ok: false, error: "vapid_not_configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = createServiceClient();
  if (!client) {
    return new Response(JSON.stringify({ ok: false, error: "supabase_not_configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let limit = 10;
  if (req.method === "POST") {
    try {
      const body = await req.json() as { limit?: number };
      if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
        limit = Math.max(1, Math.min(50, Math.floor(body.limit)));
      }
    } catch {
      /* default batch */
    }
  }

  const { data: claimed, error: claimError } = await client.rpc("cab_claim_push_delivery_batch", {
    p_limit: limit,
  });

  if (claimError) {
    return new Response(JSON.stringify({ ok: false, error: claimError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const deliveries = (claimed ?? []) as DeliveryRow[];
  for (const delivery of deliveries) {
    await processDelivery(client, delivery, vapid);
  }

  return new Response(
    JSON.stringify({ ok: true, processed: deliveries.length }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
