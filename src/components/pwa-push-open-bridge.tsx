"use client";

import { memo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { isAuthSessionEstablished, useAuth } from "@/context/auth-context";
import { notificationsEntry } from "@/lib/domain/notifications-entry";
import { runPwaNotificationSync } from "@/lib/pwa/pwa-notification-sync";
import { runPwaSyncFinalization } from "@/lib/pwa/pwa-sync-finalization";
import {
  parsePushNotificationIdFromLocation,
  PWA_PUSH_OPEN_MESSAGE_TYPE,
  stripPushNotificationIdFromHref,
  type PwaPushOpenMessage,
} from "@/lib/pwa/push-routing";
import { requestOpenNotificationCenter } from "@/lib/pwa/pwa-notification-state";

async function markNotificationReadById(notificationId: string): Promise<void> {
  if (!notificationId.trim()) return;
  await notificationsEntry.markRead(notificationId);
}

export const PwaPushOpenBridge = memo(function PwaPushOpenBridge() {
  const { status } = useAuth();
  const authReady = isAuthSessionEstablished(status);
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return;

    const handleOpen = async (notificationId: string | null, href: string) => {
      const cleanHref = stripPushNotificationIdFromHref(href);
      if (notificationId) {
        await markNotificationReadById(notificationId);
      }
      runPwaNotificationSync(queryClient);
      requestOpenNotificationCenter();

      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (cleanHref && cleanHref !== currentPath) {
        router.push(cleanHref);
      }

      const stripped = stripPushNotificationIdFromHref(currentPath);
      if (stripped !== currentPath) {
        router.replace(stripped);
      }
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data as PwaPushOpenMessage | undefined;
      if (!data || data.type !== PWA_PUSH_OPEN_MESSAGE_TYPE) return;
      void handleOpen(data.notificationId ?? null, data.href);
    };

    navigator.serviceWorker?.addEventListener("message", onMessage);

    const pendingId = parsePushNotificationIdFromLocation(window.location.search);
    if (pendingId) {
      void (async () => {
        runPwaSyncFinalization(queryClient);
        await handleOpen(pendingId, window.location.href);
      })();
    }

    return () => {
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [authReady, queryClient, router]);

  return null;
});
