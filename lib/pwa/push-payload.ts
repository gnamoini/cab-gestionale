import type { PushNotificationPayload } from "@/lib/pwa/push-types";
import { PWA_ICON_BASE_PATH } from "@/lib/pwa/pwa-icons";
import { resolvePushHrefFromNotification, resolvePushNotificationUrl } from "@/lib/pwa/push-routing";

export type PushPayloadInput = {
  notificationId?: string;
  title: string;
  body: string;
  href?: string | null;
  dedup_key: string;
  type?: string;
  entity_id?: string | null;
  traceId?: string;
};

export function buildPushNotificationPayload(input: PushPayloadInput): PushNotificationPayload {
  const title = input.title.trim() || "CAB Gestionale";
  const body = input.body.trim() || "Nuova notifica";
  const href = resolvePushNotificationUrl(
    resolvePushHrefFromNotification({
      type: input.type ?? "",
      href: input.href,
      entity_id: input.entity_id,
    }),
  );
  const tag = input.dedup_key.trim() || input.type?.trim() || "cab-notification";

  return {
    title,
    body,
    icon: `${PWA_ICON_BASE_PATH}/icon-192x192.png`,
    tag,
    href,
    notificationId: input.notificationId?.trim() || undefined,
    type: input.type?.trim() || undefined,
    traceId: input.traceId?.trim() || undefined,
  };
}
