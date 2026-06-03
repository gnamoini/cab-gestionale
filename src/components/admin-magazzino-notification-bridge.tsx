"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useToastContext } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import {
  adminMagazzinoNotificationDedupKey,
  formatMagazzinoSottoScortaToastMessage,
  isDashboardNotificationsPath,
  isMagazzinoNotificationsPath,
} from "@/lib/lavorazioni/admin-notifications";
import { publishAdminDashboardNotification } from "@/lib/notifications/admin-dashboard-desktop";
import {
  findRicambioInListCache,
  stockSnapshotFromListCache,
} from "@/lib/magazzino/find-ricambio-in-list-cache";
import { magazzinoCrossingToNotification } from "@/lib/magazzino/magazzino-sotto-scorta-notification-mapper";
import { magazzinoListQueryKey, mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import {
  getRicambioStockSnapshot,
  seedRicambioStockSnapshotsFromRicambi,
  setRicambioStockSnapshot,
} from "@/lib/magazzino/ricambio-stock-snapshot-registry";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { usePermissions } from "@/src/hooks/use-permissions";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const CLIENT_DEDUP_MS = 30_000;

/**
 * Bridge admin: cab-sync entity_updated magazzino_ricambi → crossing sotto scorta → localStorage store.
 * Nessuna modifica a realtime bridge, truth layer o invalidate system.
 */
export function AdminMagazzinoNotificationBridge() {
  const { user } = useAuth();
  const { isAdmin, isLoading } = usePermissions();
  const pathname = usePathname() ?? "";
  const { push } = useToastContext();
  const queryClient = useQueryClient();
  const { data: settingsPayload } = useCabAppSettingsPayloadQuery();
  const mezziListe = settingsPayload?.resolved?.mezziListe;
  const seenRef = useRef<Map<string, number>>(new Map());
  const seededRef = useRef(false);

  const seedRegistryFromCache = useCallback(() => {
    if (seededRef.current || !mezziListe) return;
    const rows = queryClient.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey());
    if (!rows?.length) return;
    seedRicambioStockSnapshotsFromRicambi(mapMagazzinoRowsToUI(rows, "Sistema", mezziListe));
    seededRef.current = true;
  }, [queryClient, mezziListe]);

  const handleRicambioUpdated = useCallback(
    (ricambioId: string) => {
      const userId = user?.id;
      if (!isAdmin || !userId) return;

      const now = Date.now();
      for (const [k, ts] of seenRef.current) {
        if (now - ts > CLIENT_DEDUP_MS) seenRef.current.delete(k);
      }
      const dedupKey = adminMagazzinoNotificationDedupKey(ricambioId);
      if (seenRef.current.has(dedupKey)) return;
      seenRef.current.set(dedupKey, now);

      const prev =
        getRicambioStockSnapshot(ricambioId) ?? stockSnapshotFromListCache(queryClient, ricambioId, mezziListe);

      const resolveAndNotify = () => {
        const curr = stockSnapshotFromListCache(queryClient, ricambioId, mezziListe);
        if (!curr) return;

        const ricambio = findRicambioInListCache(queryClient, ricambioId, mezziListe);
        const notification = magazzinoCrossingToNotification({
          ricambioId,
          prev,
          curr,
          ricambio,
          pathname,
          isAdmin: true,
        });

        setRicambioStockSnapshot(ricambioId, curr);

        if (!notification) return;

        void publishAdminDashboardNotification(userId, notification);

        if (isDashboardNotificationsPath(pathname) || isMagazzinoNotificationsPath(pathname)) return;

        push(formatMagazzinoSottoScortaToastMessage(notification), "info", 5000);
      };

      queueMicrotask(() => {
        setTimeout(resolveAndNotify, 0);
      });
    },
    [isAdmin, mezziListe, pathname, push, queryClient, user?.id],
  );

  useCabSyncListener(
    "magazzino_ricambi",
    useCallback(
      (event) => {
        if (event.type !== "entity_updated" || !event.id) return;
        handleRicambioUpdated(event.id);
      },
      [handleRicambioUpdated],
    ),
  );

  useEffect(() => {
    if (!isAdmin || isLoading || !mezziListe) return;
    seedRegistryFromCache();
  }, [isAdmin, isLoading, mezziListe, seedRegistryFromCache]);

  useEffect(() => {
    if (!isAdmin || isLoading || !user?.id || !mezziListe) return;
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      const key = event.query.queryKey;
      if (key[0] !== magazzinoListQueryKey()[0]) return;
      seedRegistryFromCache();
    });
    return unsub;
  }, [isAdmin, isLoading, mezziListe, queryClient, seedRegistryFromCache, user?.id]);

  return null;
}
