import "server-only";

import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliveryProvider } from "@/lib/notifications/delivery/providers/delivery-provider";
import { buildPushNotificationPayload } from "@/lib/pwa/push-payload";
import { resolvePwaPushServerEnabled } from "@/lib/pwa/push-enabled";

function getVapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:service@autocompattatori.it";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function createWebPushProvider(
  client: SupabaseClient,
  loadSubscription: (deviceId: string) => Promise<{
    endpoint: string;
    p256dh: string;
    auth: string;
    company_id: string;
  } | null>,
): DeliveryProvider {
  return {
    id: "webpush",
    async deliver(ctx) {
      if (!resolvePwaPushServerEnabled(getVapidConfig() !== null)) {
        return { success: true, channel: "push", providerId: "webpush", error: "push_disabled" };
      }

      const vapid = getVapidConfig();
      if (!vapid) {
        return { success: false, channel: "push", providerId: "webpush", error: "vapid_not_configured" };
      }

      const deviceId = ctx.device?.deviceId;
      if (!deviceId) {
        return { success: false, channel: "push", providerId: "webpush", error: "no_device" };
      }

      const sub = await loadSubscription(deviceId);
      if (!sub) {
        return { success: false, channel: "push", providerId: "webpush", error: "subscription_missing" };
      }

      const renderStart = Date.now();
      const payload = JSON.stringify(
        buildPushNotificationPayload({
          notificationId: ctx.resolved.id,
          title: ctx.resolved.title,
          body: ctx.resolved.body,
          href: ctx.resolved.deepLink,
          dedup_key: ctx.notification.dedupKey,
          type: ctx.resolved.notificationType,
          entity_id: ctx.notification.entityId,
        }),
      );
      const renderMs = Date.now() - renderStart;

      webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
      const t0 = Date.now();
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        await recordDelivery(client, ctx, "delivered", renderMs, Date.now() - t0);
        return { success: true, channel: "push", providerId: "webpush", renderMs, providerMs: Date.now() - t0 };
      } catch (error) {
        const status = (error as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await client
            .from("push_subscriptions")
            .update({ revoked_at: new Date().toISOString() })
            .eq("company_id", sub.company_id)
            .eq("endpoint", sub.endpoint)
            .is("revoked_at", null);
        }
        const msg = error instanceof Error ? error.message : "push_send_failed";
        await recordDelivery(client, ctx, "failed", renderMs, Date.now() - t0, msg);
        return { success: false, channel: "push", providerId: "webpush", error: msg, renderMs, providerMs: Date.now() - t0 };
      }
    },
  };
}

async function recordDelivery(
  client: SupabaseClient,
  ctx: Parameters<DeliveryProvider["deliver"]>[0],
  status: string,
  renderMs: number,
  providerMs: number,
  error?: string,
): Promise<void> {
  await client.from("notification_delivery").insert({
    notification_id: ctx.notification.id,
    channel: ctx.channel,
    device_id: ctx.device?.deviceId ?? null,
    provider: "webpush",
    status,
    render_ms: renderMs,
    provider_ms: providerMs,
    error: error ?? null,
    recipient_id: ctx.recipient.id,
  });
}

export const webPushProvider: DeliveryProvider = {
  id: "webpush",
  async deliver() {
    return { success: false, channel: "push", providerId: "webpush", error: "use_server_factory" };
  },
};
