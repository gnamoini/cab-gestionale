"use client";

import { memo, useEffect } from "react";
import { PWA_PUSH_ENABLED } from "@/lib/pwa/pwa-config";
import { isWebPushSupported } from "@/lib/pwa/push-client";
import { upsertPushSubscriptionRpc } from "@/lib/pwa/push-subscriptions";
import { registerPwaServiceWorker } from "@/lib/pwa/sw-register";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

/** Sincronizza subscription esistente col backend post-auth — nessuna UI. */
export const PwaPushPermissionBridge = memo(function PwaPushPermissionBridge() {
  useEffect(() => {
    if (!PWA_PUSH_ENABLED || !isWebPushSupported()) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    let cancelled = false;

    void (async () => {
      const registration = await registerPwaServiceWorker();
      if (!registration || cancelled) return;

      const sub = await registration.pushManager.getSubscription();
      if (!sub || cancelled) return;

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
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
});
