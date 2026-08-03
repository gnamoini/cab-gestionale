"use client";

import { memo, useCallback, useEffect } from "react";
import { PWA_PUSH_ENABLED } from "@/lib/pwa/pwa-config";
import { isWebPushSupported } from "@/lib/pwa/push-client";
import { upsertPushSubscriptionRpc } from "@/lib/pwa/push-subscriptions";
import { registerPwaServiceWorker } from "@/lib/pwa/sw-register";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

async function syncExistingPushSubscription(registration: ServiceWorkerRegistration): Promise<void> {
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;

  const json = sub.toJSON();
  const endpoint = json.endpoint ?? sub.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return;

  await upsertPushSubscriptionRpc(
    getBrowserSupabase(),
    { endpoint, keys: { p256dh, auth } },
    navigator.userAgent,
  );
}

/** Sincronizza subscription esistente col backend post-auth — nessuna UI. */
export const PwaPushPermissionBridge = memo(function PwaPushPermissionBridge() {
  const syncSubscription = useCallback(async () => {
    if (!PWA_PUSH_ENABLED || !isWebPushSupported()) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const registration = await registerPwaServiceWorker();
    if (!registration) return;
    await syncExistingPushSubscription(registration);
  }, []);

  useEffect(() => {
    void syncSubscription();
  }, [syncSubscription]);

  useEffect(() => {
    if (!PWA_PUSH_ENABLED || !isWebPushSupported()) return;
    if (!navigator.serviceWorker) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "PWA_PUSH_SUBSCRIPTION_CHANGE") {
        void syncSubscription();
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [syncSubscription]);

  return null;
});
