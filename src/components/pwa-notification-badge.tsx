"use client";

import { memo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { syncPwaAppBadge } from "@/lib/pwa/pwa-notification-badge";
import { notificationsEntry } from "@/lib/domain/notifications-entry";
import { QK } from "@/src/lib/react-query/query-keys";

/** Badge OS solo da unread count DB — mai da eventi push. */
export const PwaNotificationBadgeBridge = memo(function PwaNotificationBadgeBridge() {
  const { user, status } = useAuth();
  const userId = user?.id ?? "";
  const authReady = isAuthSessionEstablished(status) && userId.length > 0;
  const lastCountRef = useRef<number | null>(null);

  const unreadQuery = useQuery({
    queryKey: [...QK.notificationsUnread, userId] as const,
    queryFn: async () => {
      const res = await notificationsEntry.countUnread();
      if (!res.success) throw new Error(res.error ?? "Errore conteggio");
      return res.data ?? 0;
    },
    enabled: authReady,
    staleTime: 15_000,
  });

  const unreadCount = unreadQuery.data ?? 0;

  useEffect(() => {
    if (!authReady) {
      void syncPwaAppBadge(0);
      lastCountRef.current = null;
      return;
    }
    if (lastCountRef.current === unreadCount) return;
    lastCountRef.current = unreadCount;
    void syncPwaAppBadge(unreadCount);
  }, [authReady, unreadCount]);

  return null;
});
