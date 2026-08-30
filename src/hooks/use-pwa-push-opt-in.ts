"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { PWA_PUSH_ENABLED } from "@/lib/pwa/pwa-config";
import { subscribeToWebPush, isWebPushSupported } from "@/lib/pwa/push-client";
import {
  isPushOptInDismissedInStorage,
  PWA_PUSH_OPTIN_DISMISS_TTL_MS,
  PWA_PUSH_OPTIN_MIN_ENGAGEMENT_MS,
  writePushOptInDismiss,
} from "@/lib/pwa/push-optin-state";
import { writeNotificationOptInDeclined } from "@/lib/notifications/notification-opt-in-decision";
import { writePwaPushDeviceState } from "@/lib/pwa/push-device-state";
import { shouldShowPwaPushOptInUi } from "@/lib/pwa/push-permission-flow";
import {
  resolvePushPermissionState,
} from "@/lib/pwa/push-permission-state";
import type { PushPermissionState } from "@/lib/pwa/push-types";
import { registerPwaServiceWorker } from "@/lib/pwa/sw-register";
import { upsertPushSubscriptionRpc } from "@/lib/pwa/push-subscriptions";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";

const REVOKED_KEY = "cab-pwa-push-subscription-revoked";

function readRevokedFlag(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(REVOKED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeRevokedFlag(value: boolean): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (value) sessionStorage.setItem(REVOKED_KEY, "1");
    else sessionStorage.removeItem(REVOKED_KEY);
  } catch {
    /* ignore */
  }
}

function readPermission(): NotificationPermission | undefined {
  if (typeof Notification === "undefined") return undefined;
  return Notification.permission;
}

function subscribePermission(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onVisibility = () => onStoreChange();
  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}

export function usePwaPushOptIn() {
  const [engagementElapsed, setEngagementElapsed] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionRevoked, setSubscriptionRevoked] = useState(() => readRevokedFlag());
  const [, setDismissed] = useState(() => isPushOptInDismissedInStorage(Date.now()));
  const [busy, setBusy] = useState(false);

  const notificationPermission = useSyncExternalStore(
    subscribePermission,
    readPermission,
    () => undefined,
  );

  useEffect(() => {
    if (!PWA_PUSH_ENABLED) return;
    const schedule = (cb: () => void) => {
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(cb, { timeout: PWA_PUSH_OPTIN_MIN_ENGAGEMENT_MS + 500 });
        return () => window.cancelIdleCallback(id);
      }
      const id = window.setTimeout(cb, PWA_PUSH_OPTIN_MIN_ENGAGEMENT_MS);
      return () => window.clearTimeout(id);
    };
    return schedule(() => setEngagementElapsed(true));
  }, []);

  useEffect(() => {
    const sync = () => {
      setDismissed(isPushOptInDismissedInStorage(Date.now()));
      setSubscriptionRevoked(readRevokedFlag());
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    if (!PWA_PUSH_ENABLED || !isWebPushSupported()) return;
    let cancelled = false;

    void (async () => {
      const registration = await registerPwaServiceWorker();
      if (!registration || cancelled) return;
      const sub = await registration.pushManager.getSubscription();
      if (!cancelled) setHasActiveSubscription(Boolean(sub));
    })();

    return () => {
      cancelled = true;
    };
  }, [notificationPermission]);

  const permissionState: PushPermissionState = resolvePushPermissionState({
    pushEnabled: PWA_PUSH_ENABLED,
    hasPushManager: typeof window !== "undefined" && "PushManager" in window,
    hasServiceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    notificationPermission,
    hasActiveSubscription,
    subscriptionRevoked,
  });

  const visible =
    PWA_PUSH_ENABLED &&
    engagementElapsed &&
    shouldShowPwaPushOptInUi({ permissionState });

  const enablePush = useCallback(async () => {
    if (!PWA_PUSH_ENABLED || !isWebPushSupported()) return "unsupported" as const;
    setBusy(true);
    try {
      const registration = await registerPwaServiceWorker();
      if (!registration) return "error" as const;

      const { outcome, subscription } = await subscribeToWebPush(registration);
      if (outcome !== "granted" || !subscription) return outcome;

      const { ok } = await upsertPushSubscriptionRpc(
        getBrowserSupabase(),
        subscription,
        navigator.userAgent,
      );
      if (!ok) return "error" as const;

      writeRevokedFlag(false);
      writePwaPushDeviceState({ enabled: true, lastSubscriptionSync: Date.now() });
      setHasActiveSubscription(true);
      setSubscriptionRevoked(false);
      return "granted" as const;
    } finally {
      setBusy(false);
    }
  }, []);

  const dismissPushOptIn = useCallback(() => {
    writeNotificationOptInDeclined();
    const now = Date.now();
    writePushOptInDismiss(now);
    writePwaPushDeviceState({ dismissedUntil: now + PWA_PUSH_OPTIN_DISMISS_TTL_MS });
    setDismissed(true);
  }, []);

  return {
    permissionState,
    visible,
    busy,
    enablePush,
    dismissPushOptIn,
    markSubscriptionRevoked: () => {
      writeRevokedFlag(true);
      writePwaPushDeviceState({ enabled: false });
      setSubscriptionRevoked(true);
      setHasActiveSubscription(false);
    },
  };
}
