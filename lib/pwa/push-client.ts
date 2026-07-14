import { PWA_PUSH_ENABLED } from "@/lib/pwa/pwa-config";
import type { PushSubscribeOutcome, PushSubscriptionPayload } from "@/lib/pwa/push-types";

export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

export function isWebPushSupported(): boolean {
  if (!PWA_PUSH_ENABLED) return false;
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!getVapidPublicKey()) return false;
  return true;
}

function subscriptionToPayload(sub: PushSubscription): PushSubscriptionPayload | null {
  const json = sub.toJSON();
  const endpoint = json.endpoint ?? sub.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return null;
  return { endpoint, keys: { p256dh, auth } };
}

export async function subscribeToWebPush(
  registration: ServiceWorkerRegistration,
): Promise<{ outcome: PushSubscribeOutcome; subscription: PushSubscriptionPayload | null }> {
  if (!isWebPushSupported()) {
    return { outcome: "unsupported", subscription: null };
  }

  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    return { outcome: "unsupported", subscription: null };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { outcome: "denied", subscription: null };
    }

    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const payload = subscriptionToPayload(sub);
    if (!payload) return { outcome: "error", subscription: null };
    return { outcome: "granted", subscription: payload };
  } catch {
    return { outcome: "error", subscription: null };
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
