"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useToastContext } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import {
  adminNotificationDedupKey,
  formatAdminNotificationToastMessage,
  formatLavorazioneCompletataToastMessage,
  isDashboardNotificationsPath,
  shouldShowLightLavorazioneAlert,
} from "@/lib/lavorazioni/admin-notifications";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { findLavorazioneInListCache, getLavorazioniListFromCache } from "@/lib/lavorazioni/find-lavorazione-in-list-cache";
import { lavorazioneCreatedEventToIntent } from "@/lib/lavorazioni/lavorazione-created-notification-mapper";
import { lavorazioneCompletedEventToIntent } from "@/lib/lavorazioni/lavorazione-completed-notification-mapper";
import {
  getLavorazioneStatoSnapshot,
  seedLavorazioneStatoSnapshotsFromRows,
  setLavorazioneStatoSnapshot,
} from "@/lib/lavorazioni/lavorazione-stato-snapshot-registry";
import { shouldSuppressRemoteCacheInvalidation } from "@/lib/sync/recent-local-mutation";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";

const CLIENT_DEDUP_MS = 30_000;

/** Bridge: cab-sync lavorazioni → toast UX (inbox via notification_outbox server-side). */
export function AdminLavorazioniNotificationBridge() {
  const { user } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const pathname = usePathname() ?? "";
  const { push } = useToastContext();
  const queryClient = useQueryClient();
  const seenRef = useRef<Map<string, number>>(new Map());
  const seededRef = useRef(false);

  const staffEligible =
    !permsLoading &&
    isStaffInboxEligible(snapshot ? { ruolo: snapshot.role } : user, snapshot?.rbacContext);

  const seedRegistryFromCache = useCallback(() => {
    if (seededRef.current) return;
    const rows = getLavorazioniListFromCache(queryClient);
    if (!rows.length) return;
    seedLavorazioneStatoSnapshotsFromRows(rows);
    seededRef.current = true;
  }, [queryClient]);

  const touchDedup = useCallback((dedupKey: string): boolean => {
    const now = Date.now();
    for (const [k, ts] of seenRef.current) {
      if (now - ts > CLIENT_DEDUP_MS) seenRef.current.delete(k);
    }
    if (seenRef.current.has(dedupKey)) return false;
    seenRef.current.set(dedupKey, now);
    return true;
  }, []);

  const handleNewLavorazione = useCallback(
    (lavorazioneId: string) => {
      if (!staffEligible || !user?.id) return;
      if (!touchDedup(adminNotificationDedupKey(lavorazioneId))) return;

      const row = findLavorazioneInListCache(queryClient, lavorazioneId);
      const intent = lavorazioneCreatedEventToIntent({
        event: { type: "entity_created", entity: "lavorazioni", id: lavorazioneId },
        pathname,
        isLocalCreate: shouldSuppressRemoteCacheInvalidation("lavorazioni", lavorazioneId),
        row,
      });
      if (!intent) return;

      if (row?.stato) setLavorazioneStatoSnapshot(lavorazioneId, row.stato);

      if (isDashboardNotificationsPath(pathname)) return;
      if (shouldShowLightLavorazioneAlert(pathname)) {
        push(formatAdminNotificationToastMessage(intent), "info", 5000);
      }
    },
    [pathname, push, queryClient, staffEligible, touchDedup, user?.id],
  );

  const handleLavorazioneUpdated = useCallback(
    (lavorazioneId: string) => {
      if (!staffEligible || !user?.id) return;

      const isLocal = shouldSuppressRemoteCacheInvalidation("lavorazioni", lavorazioneId);
      const prevStato = getLavorazioneStatoSnapshot(lavorazioneId);

      const resolveAndNotify = () => {
        const row = findLavorazioneInListCache(queryClient, lavorazioneId);
        if (row?.stato) setLavorazioneStatoSnapshot(lavorazioneId, row.stato);

        const intent = lavorazioneCompletedEventToIntent({
          lavorazioneId,
          prevStato,
          currRow: row,
          pathname,
          isLocalUpdate: isLocal,
        });
        if (!intent) return false;

        const dedupKey = `admin-lav-done:${lavorazioneId}`;
        if (!touchDedup(dedupKey)) return true;

        if (isDashboardNotificationsPath(pathname)) return true;
        if (shouldShowLightLavorazioneAlert(pathname)) {
          push(formatLavorazioneCompletataToastMessage(intent), "info", 5000);
        }
        return true;
      };

      if (resolveAndNotify()) return;
      queueMicrotask(() => {
        resolveAndNotify();
      });
    },
    [pathname, push, queryClient, staffEligible, touchDedup, user?.id],
  );

  useCabSyncListener(
    "lavorazioni",
    useCallback(
      (event) => {
        if (event.type === "settings_updated") return;
        if (event.type === "entity_created") handleNewLavorazione(event.id);
        if (event.type === "entity_updated") handleLavorazioneUpdated(event.id);
      },
      [handleLavorazioneUpdated, handleNewLavorazione],
    ),
  );

  useEffect(() => {
    if (!staffEligible || permsLoading) return;
    seedRegistryFromCache();
  }, [permsLoading, seedRegistryFromCache, staffEligible]);

  return null;
}
