"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/context/toast-context";
import { usePermissions } from "@/src/hooks/use-permissions";
import { subscribeNotificheGestionale } from "@/lib/sync/gestionale-notification-dispatch";

/**
 * Bridge unico notifiche operative -> toast UI.
 * Filtra su ruoli admin/autorizzati e deduplica ulteriormente per viewport.
 */
export function GestionaleNotificationsBridge() {
  const { push } = useToast();
  const { isAdmin, canManageSecurity, isLoading } = usePermissions();
  const canViewOperationalNotifications = isAdmin || canManageSecurity;
  const recentRef = useRef<Map<string, number>>(new Map());
  const VIEW_DEDUP_MS = 2500;

  useEffect(() => {
    if (isLoading || !canViewOperationalNotifications) return;
    return subscribeNotificheGestionale((notification) => {
      const now = Date.now();
      for (const [k, ts] of recentRef.current) {
        if (now - ts > VIEW_DEDUP_MS) recentRef.current.delete(k);
      }
      if (recentRef.current.has(notification.fingerprint)) return;
      recentRef.current.set(notification.fingerprint, now);
      push(notification.message, notification.tone, 4200);
    });
  }, [canViewOperationalNotifications, isLoading, push]);

  return null;
}
