"use client";

import { memo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import { syncPwaAppBadge } from "@/lib/pwa/pwa-notification-badge";
import { notificationsEntry } from "@/lib/domain/notifications-entry";
import { QK } from "@/src/lib/react-query/query-keys";
import { useInboxEligible } from "@/src/hooks/gestionale/use-inbox-eligible";

/** Badge OS solo da unread count DB — gated su RPC inbox eligibility. */
export const PwaNotificationBadgeBridge = memo(function PwaNotificationBadgeBridge() {
  const { user, status } = useAuth();
  const userId = user?.id ?? "";
  const authReady = isAuthSessionEstablished(status) && userId.length > 0;
  const { eligible: inboxEligible, isLoading: eligibilityLoading } = useInboxEligible();
  const lastCountRef = useRef<number | null>(null);

  const unreadQuery = useQuery({
    queryKey: [...QK.notificationsUnread, userId] as const,
    queryFn: async () => {
      const res = await notificationsEntry.countUnread();
      if (!res.success) throw new Error(res.error ?? "Errore conteggio");
      return res.data ?? 0;
    },
    enabled: authReady && inboxEligible && !eligibilityLoading,
    staleTime: 15_000,
  });

  const unreadCount = unreadQuery.data ?? 0;

  useEffect(() => {
    if (!authReady || !inboxEligible) {
      void syncPwaAppBadge(0);
      lastCountRef.current = null;
      return;
    }
    if (lastCountRef.current === unreadCount) return;
    lastCountRef.current = unreadCount;
    void syncPwaAppBadge(unreadCount);
  }, [authReady, inboxEligible, unreadCount]);

  return null;
});
