"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useToastContext } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import {
  formatPreventivoApprovatoToastMessage,
  isDashboardNotificationsPath,
  isPreventiviNotificationsPath,
} from "@/lib/lavorazioni/admin-notifications";
import { findPreventivoInListCache } from "@/lib/preventivi/find-preventivo-in-list-cache";
import { preventivoApprovatoEventToIntent } from "@/lib/preventivi/preventivo-approvato-notification-mapper";
import {
  getPreventivoStatoSnapshot,
  seedPreventivoStatoSnapshotsFromRecords,
  setPreventivoStatoSnapshot,
} from "@/lib/preventivi/preventivo-stato-snapshot-registry";
import { getPreventiviRecordsFromCache } from "@/lib/preventivi/preventivi-records-from-cache";
import { wrapPreventivoApprovatoNotification } from "@/lib/notifications/admin-dashboard-notifications";
import { publishNotification } from "@/lib/notifications/publish-notification";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { shouldSuppressRemoteCacheInvalidation } from "@/lib/sync/recent-local-mutation";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";

const CLIENT_DEDUP_MS = 30_000;

/**
 * Bridge: cab-sync preventivi entity_updated → transizione approvato → inbox.
 */
export function AdminPreventiviNotificationBridge() {
  const { user } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const { mode } = useNotificationsV2Mode();
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
    const records = getPreventiviRecordsFromCache(queryClient);
    if (!records.length) return;
    seedPreventivoStatoSnapshotsFromRecords(records);
    seededRef.current = true;
  }, [queryClient]);

  const handlePreventivoUpdated = useCallback(
    (preventivoId: string) => {
      const userId = user?.id;
      if (!staffEligible || !userId) return;

      const now = Date.now();
      for (const [k, ts] of seenRef.current) {
        if (now - ts > CLIENT_DEDUP_MS) seenRef.current.delete(k);
      }
      const dedupKey = `admin-prev-approved:${preventivoId}`;
      if (seenRef.current.has(dedupKey)) return;

      const isLocal = shouldSuppressRemoteCacheInvalidation("preventivi", preventivoId);
      const prevStato = getPreventivoStatoSnapshot(preventivoId);

      const resolveAndNotify = () => {
        const record = findPreventivoInListCache(queryClient, preventivoId);
        if (record?.stato) setPreventivoStatoSnapshot(preventivoId, record.stato);

        const intent = preventivoApprovatoEventToIntent({
          preventivoId,
          prevStato,
          currRecord: record,
          pathname,
          isLocalUpdate: isLocal,
        });
        if (!intent) return false;

        seenRef.current.set(dedupKey, now);
        const wrapped = wrapPreventivoApprovatoNotification({
          preventivoId: intent.preventivoId,
          numero: intent.numero,
          cliente: intent.cliente,
          totale: intent.totale,
          createdAt: intent.createdAt,
        });
        void publishNotification(userId, wrapped, mode);

        if (isDashboardNotificationsPath(pathname) || isPreventiviNotificationsPath(pathname)) return true;
        push(formatPreventivoApprovatoToastMessage(intent), "info", 5000);
        return true;
      };

      if (resolveAndNotify()) return;
      queueMicrotask(() => {
        resolveAndNotify();
      });
    },
    [mode, pathname, push, queryClient, staffEligible, user?.id],
  );

  useCabSyncListener(
    "preventivi",
    useCallback(
      (event) => {
        if (event.type !== "entity_updated" || !event.id) return;
        handlePreventivoUpdated(event.id);
      },
      [handlePreventivoUpdated],
    ),
  );

  useEffect(() => {
    if (!staffEligible || permsLoading) return;
    seedRegistryFromCache();
  }, [permsLoading, seedRegistryFromCache, staffEligible]);

  return null;
}
