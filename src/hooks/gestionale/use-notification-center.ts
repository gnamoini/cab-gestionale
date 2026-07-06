"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, isAuthSessionEstablished } from "@/context/auth-context";
import type { InboxCursor, InboxNotificationRow } from "@/lib/notifications/notification-types";
import { isClientInboxEligible } from "@/lib/notifications/client-inbox-eligible";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { RealtimeInboxCoordinator } from "@/lib/notifications/realtime-inbox-coordinator";
import { notificationsV2ReadsDb } from "@/lib/notifications/notifications-v2-flag";
import { notificationsEntry } from "@/lib/domain/notifications-entry";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";

const PAGE_SIZE = 50;

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
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const { readsDb, mode } = useNotificationsV2Mode();
  const queryClient = useQueryClient();
  const coordinatorRef = useRef<RealtimeInboxCoordinator | null>(null);

  const rbacCtx = snapshot?.rbacContext;
  const eligibleUser = snapshot?.role ? { ruolo: snapshot.role } : user;
  const enabled =
    isAuthSessionEstablished(status) &&
    userId.length > 0 &&
    !permsLoading &&
    readsDb &&
    (isStaffInboxEligible(eligibleUser, rbacCtx) || isClientInboxEligible(eligibleUser, rbacCtx));

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
  });

  const notifications = useMemo(
    () => inboxQuery.data?.pages.flat() ?? [],
    [inboxQuery.data?.pages],
  );

  const unreadCount = unreadQuery.data ?? 0;

  const refresh = useCallback(async () => {
    await Promise.all([inboxQuery.refetch(), unreadQuery.refetch()]);
  }, [inboxQuery, unreadQuery]);

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

  const markedAllOnOpenRef = useRef(false);

  useEffect(() => {
    if (!drawerOpen) {
      markedAllOnOpenRef.current = false;
      return;
    }
    if (!enabled || markedAllOnOpenRef.current) return;
    markedAllOnOpenRef.current = true;
    void markAllRead();
  }, [drawerOpen, enabled, markAllRead]);

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
    const coord = new RealtimeInboxCoordinator({ userId, queryClient, drawerOpen });
    coordinatorRef.current = coord;
    void coord.start();
    return () => {
      coord.stop();
      coordinatorRef.current = null;
    };
  }, [enabled, userId, queryClient]);

  useEffect(() => {
    coordinatorRef.current?.setDrawerOpen(drawerOpen);
  }, [drawerOpen]);

  return {
    notifications,
    unreadCount,
    enabled,
    mode,
    isLoading: inboxQuery.isLoading || unreadQuery.isLoading || permsLoading,
    dismissNotification,
    dismissAllNotifications,
    isDismissingAll,
    loadMore,
    hasMore: Boolean(inboxQuery.hasNextPage),
    isLoadingMore: inboxQuery.isFetchingNextPage,
    channelStatus: coordinatorRef.current?.channelStatus ?? "off",
  };
}

/** Hook legacy wrapper: delega a v2 quando readsDb. */
export function useNotificationCenterOrLegacyEnabled(): boolean {
  const { readsDb } = useNotificationsV2Mode();
  return readsDb;
}
