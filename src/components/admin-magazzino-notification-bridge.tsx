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
import { markCabSyncToastSuppressed } from "@/lib/notifications/cab-sync-toast-suppress";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { findRicambioInListCache, stockSnapshotFromListCache } from "@/lib/magazzino/find-ricambio-in-list-cache";
import { magazzinoCrossingToNotification } from "@/lib/magazzino/magazzino-sotto-scorta-notification-mapper";
import { magazzinoListQueryKey, mapMagazzinoRowsToUI } from "@/lib/magazzino/magazzino-list-cache";
import {
  getRicambioStockSnapshot,
  seedRicambioStockSnapshotsFromRicambi,
  setRicambioStockSnapshot,
} from "@/lib/magazzino/ricambio-stock-snapshot-registry";
import { useCabSyncListener } from "@/src/hooks/use-cab-sync-listener";
import { useCabAppSettingsPayloadQuery } from "@/src/hooks/gestionale/use-settings-queries";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

const CLIENT_DEDUP_MS = 30_000;

/** Bridge: cab-sync magazzino → toast UX (inbox via notification_outbox server-side). */
export function AdminMagazzinoNotificationBridge() {
  const { user } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const pathname = usePathname() ?? "";
  const { push } = useToastContext();
  const queryClient = useQueryClient();
  const { data: settingsPayload } = useCabAppSettingsPayloadQuery({ tier: "static" });
  const mezziListe = settingsPayload?.resolved?.mezziListe;
  const seenRef = useRef<Map<string, number>>(new Map());
  const seededRef = useRef(false);

  const staffEligible =
    !permsLoading &&
    isStaffInboxEligible(snapshot ? { ruolo: snapshot.role } : user, snapshot?.rbacContext);

  const seedRegistryFromCache = useCallback(() => {
    if (seededRef.current || !mezziListe) return;
    const rows = queryClient.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey());
    if (!rows?.length) return;
    seedRicambioStockSnapshotsFromRicambi(mapMagazzinoRowsToUI(rows, "Sistema", mezziListe));
    seededRef.current = true;
  }, [queryClient, mezziListe]);

  const handleRicambioUpdated = useCallback(
    (ricambioId: string) => {
      if (!staffEligible || !user?.id) return;

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
        if (!curr) return false;

        const ricambio = findRicambioInListCache(queryClient, ricambioId, mezziListe);
        const notification = magazzinoCrossingToNotification({
          ricambioId,
          prev,
          curr,
          ricambio,
          pathname,
        });

        setRicambioStockSnapshot(ricambioId, curr);

        if (!notification) return false;

        markCabSyncToastSuppressed("magazzino_ricambi", "entity_updated", ricambioId);

        if (isDashboardNotificationsPath(pathname) || isMagazzinoNotificationsPath(pathname)) return true;

        push(formatMagazzinoSottoScortaToastMessage(notification), "info", 5000);
        return true;
      };

      if (resolveAndNotify()) return;

      queueMicrotask(() => {
        resolveAndNotify();
      });
    },
    [mezziListe, pathname, push, queryClient, staffEligible, user?.id],
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
    if (!staffEligible || permsLoading || !mezziListe) return;
    seedRegistryFromCache();
  }, [mezziListe, permsLoading, seedRegistryFromCache, staffEligible]);

  useEffect(() => {
    if (!staffEligible || permsLoading || !user?.id || !mezziListe) return;
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      const key = event.query.queryKey;
      if (key[0] !== magazzinoListQueryKey()[0]) return;
      seedRegistryFromCache();
    });
    return unsub;
  }, [mezziListe, permsLoading, queryClient, seedRegistryFromCache, staffEligible, user?.id]);

  return null;
}
