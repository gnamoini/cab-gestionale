"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import type { InboxCursor, InboxNotificationRow } from "@/lib/notifications/notification-types";
import { RealtimeInboxCoordinator, type InboxCoordinatorHealth } from "@/lib/notifications/realtime-inbox-coordinator";
import { notificationsEntry } from "@/lib/domain/notifications-entry";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";
import { useInboxEligible } from "@/src/hooks/gestionale/use-inbox-eligible";

const PAGE_SIZE = 50;
const DEGRADED_REFETCH_INTERVAL_MS = 30_000;

function cursorFromRow(row: InboxNotificationRow): InboxCursor {
  return {
    priority_rank: row.priority_rank,
    created_at: row.created_at,
    id: row.id,
  };
}

export function useNotificationCenter(drawerOpen = false) {
  const { user, status } = useAuth();
  const userId = user?.id ?? "";
  const { readsDb } = useNotificationsV2Mode();
  const { eligible: inboxEligible, isLoading: eligibilityLoading } = useInboxEligible();
  const queryClient = useQueryClient();
  const coordinatorRef = useRef<RealtimeInboxCoordinator | null>(null);
  const [channelStatus, setChannelStatus] = useState<"live" | "degraded" | "off">("off");
  const [coordinatorHealth, setCoordinatorHealth] = useState<{
    heartbeatTimestamp: number | null;
    lastEventId: string | null;
    inboxVersion: number;
  }>({ heartbeatTimestamp: null, lastEventId: null, inboxVersion: 0 });

  const enabled =
    isAuthSessionEstablished(status) &&
    userId.length > 0 &&
    readsDb &&
    inboxEligible &&
    !eligibilityLoading;

  const degradedPolling = channelStatus === "degraded";

  const inboxQuery = useInfiniteQuery({
    queryKey: [...QK.notificationsInbox, userId] as const,
    queryFn: async ({ pageParam }) => {
      const res = await notificationsEntry.listInbox({
        limit: PAGE_SIZE,
        cursor: pageParam ?? null,
      });
      if (!res.success) throw new Error(res.error ?? "Errore inbox");
      return res.data ?? [];
    },
    initialPageParam: null as InboxCursor | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last ? cursorFromRow(last) : undefined;
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: degradedPolling ? DEGRADED_REFETCH_INTERVAL_MS : false,
  });

  const unreadQuery = useQuery({
    queryKey: [...QK.notificationsUnread, userId] as const,
    queryFn: async () => {
      const res = await notificationsEntry.countUnread();
      if (!res.success) throw new Error(res.error ?? "Errore conteggio");
      return res.data ?? 0;
    },
    enabled,
    staleTime: 15_000,
    refetchInterval: degradedPolling ? DEGRADED_REFETCH_INTERVAL_MS : false,
  });

  const notifications = useMemo(
    () => inboxQuery.data?.pages.flat() ?? [],
    [inboxQuery.data?.pages],
  );

  const unreadCount = unreadQuery.data ?? 0;

  const refresh = useCallback(async () => {
    await Promise.all([inboxQuery.refetch(), unreadQuery.refetch()]);
  }, [inboxQuery, unreadQuery]);

  const markReadById = useCallback(
    async (id: string) => {
      if (!enabled || !id.trim()) return;
      await notificationsEntry.markRead(id);
      await refresh();
    },
    [enabled, refresh],
  );

  const markAllRead = useCallback(async () => {
    if (!enabled) return;
    let total = 0;
    for (let i = 0; i < 10; i++) {
      const res = await notificationsEntry.markAllRead(200);
      if (!res.success) break;
      total += res.data ?? 0;
      if ((res.data ?? 0) === 0) break;
    }
    if (total > 0) await refresh();
  }, [enabled, refresh]);

  const dismissNotification = useCallback(
    async (row: InboxNotificationRow) => {
      if (!enabled) return;
      await notificationsEntry.dismiss(row.id);
      await refresh();
    },
    [enabled, refresh],
  );

  const [isDismissingAll, setIsDismissingAll] = useState(false);

  const dismissAllNotifications = useCallback(async () => {
    if (!enabled || isDismissingAll) return 0;
    setIsDismissingAll(true);
    try {
      let total = 0;
      for (let i = 0; i < 10; i++) {
        const res = await notificationsEntry.listInbox({ limit: 200, cursor: null });
        if (!res.success) break;
        const rows = res.data ?? [];
        if (rows.length === 0) break;
        const results = await Promise.all(rows.map((row) => notificationsEntry.dismiss(row.id)));
        total += results.filter((r) => r.success).length;
        if (rows.length < 200) break;
      }
      if (total > 0) await refresh();
      return total;
    } finally {
      setIsDismissingAll(false);
    }
  }, [enabled, isDismissingAll, refresh]);

  const loadMore = useCallback(() => {
    if (inboxQuery.hasNextPage && !inboxQuery.isFetchingNextPage) {
      void inboxQuery.fetchNextPage();
    }
  }, [inboxQuery]);

  useEffect(() => {
    if (!enabled) {
      coordinatorRef.current?.stop();
      coordinatorRef.current = null;
      return;
    }
    const coord = new RealtimeInboxCoordinator({
      userId,
      queryClient,
      drawerOpen,
      onHealthChange: (health: InboxCoordinatorHealth) => {
        setChannelStatus(health.channelStatus);
        setCoordinatorHealth({
          heartbeatTimestamp: health.heartbeatTimestamp,
          lastEventId: health.lastEventId,
          inboxVersion: health.inboxVersion,
        });
      },
    });
    coordinatorRef.current = coord;
    void coord.start();
    return () => {
      coord.stop();
      coordinatorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drawerOpen synced via setDrawerOpen effect
  }, [enabled, userId, queryClient]);

  useEffect(() => {
    coordinatorRef.current?.setDrawerOpen(drawerOpen);
  }, [drawerOpen]);

  return {
    notifications,
    unreadCount,
    enabled,
    isLoading: inboxQuery.isLoading || unreadQuery.isLoading || eligibilityLoading,
    dismissNotification,
    dismissAllNotifications,
    markReadById,
    markAllRead,
    isDismissingAll,
    loadMore,
    hasMore: Boolean(inboxQuery.hasNextPage),
    isLoadingMore: inboxQuery.isFetchingNextPage,
    channelStatus,
    coordinatorHealth,
  };
}

/** Hook legacy wrapper: delega a v2 quando readsDb. */
export function useNotificationCenterOrLegacyEnabled(): boolean {
  const { readsDb } = useNotificationsV2Mode();
  return readsDb;
}
