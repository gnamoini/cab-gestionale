import {
  appendPushNotificationIdToHref,
  PWA_PUSH_OPEN_MESSAGE_TYPE,
  resolvePushNotificationUrl,
  type PwaPushOpenMessage,
} from "@/lib/pwa/push-routing";

const PUSH_DEFAULT_ICON = "/icons/icon-192x192.png";

type PushMessageData = {
  title?: string;
  body?: string;
  icon?: string;
  tag?: string;
  href?: string;
  notificationId?: string;
  type?: string;
  traceId?: string;
};

function parsePushData(event: PushEvent): PushMessageData {
  if (!event.data) return {};
  try {
    const json = event.data.json() as PushMessageData;
    return json && typeof json === "object" ? json : {};
  } catch {
    const text = event.data.text();
    return text ? { body: text } : {};
  }
}

/** Handler push runtime-agnostic — importabile dal service worker bundle. */
export function registerPushSwHandlers(sw: ServiceWorkerGlobalScope): void {
  sw.addEventListener("push", (event) => {
    const data = parsePushData(event);
    const title = data.title?.trim() || "CAB Gestionale";
    const body = data.body?.trim() || "Nuova notifica";
    const icon = data.icon?.trim() || PUSH_DEFAULT_ICON;
    const tag = data.tag?.trim() || "cab-notification";
    const href = resolvePushNotificationUrl(data.href);
    const notificationId = data.notificationId?.trim();
    const traceId = data.traceId?.trim();

    event.waitUntil(
      (async () => {
        await sw.registration.showNotification(title, {
          body,
          icon,
          tag,
          data: { href, notificationId, type: data.type, traceId },
        });
        const clients = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({
            type: "PWA_PUSH_RECEIVED",
            notificationId,
            traceId,
          });
        }
      })(),
    );
  });

  sw.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const action = event.action?.trim() || "open";
    const raw = event.notification.data as
      | { href?: string; notificationId?: string; type?: string; traceId?: string }
      | undefined;
    const href = resolvePushNotificationUrl(raw?.href);
    const notificationId = raw?.notificationId?.trim();
    const targetHref = appendPushNotificationIdToHref(href, notificationId);

    const message: PwaPushOpenMessage = {
      type: PWA_PUSH_OPEN_MESSAGE_TYPE,
      notificationId,
      href: targetHref,
      clickedAction: action,
    };

    event.waitUntil(
      (async () => {
        const clients = await sw.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of clients) {
          if ("focus" in client) {
            client.postMessage(message);
            await client.focus();
            if ("navigate" in client && typeof client.navigate === "function") {
              await client.navigate(targetHref);
            }
            return;
          }
        }
        await sw.clients.openWindow(targetHref);
      })(),
    );
  });

  sw.addEventListener("notificationclose", (event) => {
    const raw = event.notification.data as { notificationId?: string } | undefined;
    const notificationId = raw?.notificationId?.trim();
    if (!notificationId) return;
    event.waitUntil(
      (async () => {
        const clients = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({
            type: "PWA_PUSH_DISMISSED",
            notificationId,
          });
        }
      })(),
    );
  });

  sw.addEventListener("pushsubscriptionchange", (event) => {
    event.waitUntil(
      (async () => {
        const clients = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: "PWA_PUSH_SUBSCRIPTION_CHANGE" });
        }
      })(),
    );
  });

  sw.addEventListener("sync", (event) => {
    const syncEvent = event as ExtendableEvent & { tag?: string };
    const tag = syncEvent.tag;
    if (tag !== "cab-notification-ack") return;
    syncEvent.waitUntil(
      (async () => {
        const clients = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: "PWA_NOTIFICATION_ACK_RETRY" });
        }
      })(),
    );
  });
}
