"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
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
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";

export function useAdminNotificationStore() {
  const { user } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const { readsDb, isLoading: flagLoading } = useNotificationsV2Mode();
  const userId = user?.id ?? "";
  const staffEligible =
    !permsLoading &&
    isStaffInboxEligible(snapshot ? { ruolo: snapshot.role } : user, snapshot?.rbacContext);
  const enabled = staffEligible && !flagLoading && !readsDb && userId.length > 0;

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
    permLoading: permsLoading || flagLoading,
    enabled,
  };
}

export type { AdminDashboardNotification };
