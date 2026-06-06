"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import {
  clearMagazzinoNotifications,
  countReadAdminNotifications,
  emptyAdminNotificationStore,
  getUnreadCount,
  isNotificationUnread,
  listNotifications,
  loadAdminNotificationStore,
  markAllAdminNotificationsRead,
  markAdminNotificationRead,
  removeAdminNotification,
  removeReadAdminNotifications,
  subscribeAdminNotificationStore,
  type AdminNotificationStoreState,
} from "@/lib/lavorazioni/admin-notification-store";
import type { AdminDashboardNotification } from "@/lib/notifications/admin-dashboard-notifications";
import { useRbac } from "@/src/hooks/use-rbac";

export function useAdminNotificationStore() {
  const { user } = useAuth();
  const rbac = useRbac();
  const userId = user?.id ?? "";
  const enabled = rbac.canRead("dashboard") && !rbac.isLoading && userId.length > 0;

  // SSR/hydration: mai leggere localStorage nel render iniziale (vedi docs/bootstrap-hydration.md).
  const [state, setState] = useState<AdminNotificationStoreState>(emptyAdminNotificationStore);

  useEffect(() => {
    if (!enabled) {
      setState(emptyAdminNotificationStore());
      return;
    }
    setState(loadAdminNotificationStore(userId));
    return subscribeAdminNotificationStore((changedUserId) => {
      if (changedUserId === userId) {
        setState(loadAdminNotificationStore(userId));
      }
    });
  }, [enabled, userId]);

  const notifications = useMemo(() => (enabled ? listNotifications(state) : []), [enabled, state]);
  const unreadCount = useMemo(() => (enabled ? getUnreadCount(state) : 0), [enabled, state]);
  const readCount = useMemo(() => (enabled ? countReadAdminNotifications(state) : 0), [enabled, state]);

  const markAllRead = useCallback(() => {
    if (!enabled) return;
    setState(markAllAdminNotificationsRead(userId));
  }, [enabled, userId]);

  const markNotificationRead = useCallback(
    (notification: AdminDashboardNotification) => {
      if (!enabled) return;
      setState(markAdminNotificationRead(userId, notification));
    },
    [enabled, userId],
  );

  const dismissNotification = useCallback(
    (notification: AdminDashboardNotification) => {
      if (!enabled) return;
      setState(removeAdminNotification(userId, notification));
    },
    [enabled, userId],
  );

  const removeReadNotifications = useCallback(() => {
    if (!enabled) return;
    setState(removeReadAdminNotifications(userId));
  }, [enabled, userId]);

  const clearMagazzinoNotifs = useCallback(() => {
    if (!enabled) return;
    setState(clearMagazzinoNotifications(userId));
  }, [enabled, userId]);

  const isUnread = useCallback(
    (notification: AdminDashboardNotification) =>
      enabled ? isNotificationUnread(state, notification) : false,
    [enabled, state],
  );

  return {
    notifications,
    unreadCount,
    readCount,
    markAllRead,
    markNotificationRead,
    dismissNotification,
    removeReadNotifications,
    clearMagazzinoNotifications: clearMagazzinoNotifs,
    isUnread,
    canReadDashboard: enabled,
    permLoading: rbac.isLoading,
    enabled,
  };
}

export type { AdminDashboardNotification };
