"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useToastContext } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import {
  adminNotificationDedupKey,
  formatAdminNotificationToastMessage,
  isDashboardNotificationsPath,
  shouldShowLightLavorazioneAlert,
} from "@/lib/lavorazioni/admin-notifications";
import { getUnreadCount, loadAdminNotificationStore } from "@/lib/lavorazioni/admin-notification-store";
import { publishAdminDashboardNotification } from "@/lib/notifications/admin-dashboard-desktop";
import { findLavorazioneInListCache } from "@/lib/lavorazioni/find-lavorazione-in-list-cache";
import { lavorazioneCreatedEventToIntent } from "@/lib/lavorazioni/lavorazione-created-notification-mapper";
import { wrapLavorazioneNotification } from "@/lib/notifications/admin-dashboard-notifications";
import { shouldSuppressRemoteCacheInvalidation } from "@/lib/sync/recent-local-mutation";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { usePermissions } from "@/src/hooks/use-permissions";

const CLIENT_DEDUP_MS = 30_000;

/**
 * Bridge admin: cab-sync entity_created lavorazioni → NotificationIntent → localStorage store.
 * Nessuna modifica a realtime bridge, truth layer o invalidate system.
 */
export function AdminLavorazioniNotificationBridge() {
  const { user } = useAuth();
  const { isAdmin, isLoading } = usePermissions();
  const pathname = usePathname() ?? "";
  const { push } = useToastContext();
  const queryClient = useQueryClient();
  const baseTitleRef = useRef<string | null>(null);
  const seenRef = useRef<Map<string, number>>(new Map());

  const applyDocumentTitle = useCallback(
    (userId: string) => {
      if (typeof document === "undefined" || !userId) return;
      if (baseTitleRef.current == null) baseTitleRef.current = document.title;
      const base = baseTitleRef.current;
      const unread = getUnreadCount(loadAdminNotificationStore(userId));
      if (unread > 0 && shouldShowLightLavorazioneAlert(pathname)) {
        document.title = `(${unread > 99 ? "99+" : unread}) ${base}`;
      } else {
        document.title = base;
      }
    },
    [pathname],
  );

  const handleNewLavorazione = useCallback(
    (lavorazioneId: string) => {
      const userId = user?.id;
      if (!isAdmin || !userId) return;

      const now = Date.now();
      for (const [k, ts] of seenRef.current) {
        if (now - ts > CLIENT_DEDUP_MS) seenRef.current.delete(k);
      }
      const dedupKey = adminNotificationDedupKey(lavorazioneId);
      if (seenRef.current.has(dedupKey)) return;
      seenRef.current.set(dedupKey, now);

      const row = findLavorazioneInListCache(queryClient, lavorazioneId);
      const intent = lavorazioneCreatedEventToIntent({
        event: { type: "entity_created", entity: "lavorazioni", id: lavorazioneId },
        pathname,
        isAdmin: true,
        isLocalCreate: shouldSuppressRemoteCacheInvalidation("lavorazioni", lavorazioneId),
        row,
      });
      if (!intent) return;

      const wrapped = wrapLavorazioneNotification(intent);
      void publishAdminDashboardNotification(userId, wrapped).then(() => {
        applyDocumentTitle(userId);
      });

      if (isDashboardNotificationsPath(pathname)) return;

      if (shouldShowLightLavorazioneAlert(pathname)) {
        push(formatAdminNotificationToastMessage(intent), "info", 5000);
      }
    },
    [applyDocumentTitle, isAdmin, pathname, push, queryClient, user?.id],
  );

  useCabSyncListener(
    "lavorazioni",
    useCallback(
      (event) => {
        if (event.type !== "entity_created" || !event.id) return;
        handleNewLavorazione(event.id);
      },
      [handleNewLavorazione],
    ),
  );

  useEffect(() => {
    if (!isAdmin || isLoading || !user?.id) return;
    applyDocumentTitle(user.id);
  }, [applyDocumentTitle, isAdmin, isLoading, pathname, user?.id]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    return () => {
      if (baseTitleRef.current != null) document.title = baseTitleRef.current;
    };
  }, []);

  return null;
}
