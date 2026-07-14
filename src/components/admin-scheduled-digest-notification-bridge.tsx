"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useToastContext } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import { loadAdminNotificationStore } from "@/lib/lavorazioni/admin-notification-store";
import {
  buildFattureScaduteDigestNotification,
  buildFattureScaduteDigestPayload,
  fattureScaduteDigestStoreKey,
  formatFattureScaduteDigestBody,
} from "@/lib/fatturazione/fatture-scadute-digest";
import { isDashboardNotificationsPath, isFatturazioneNotificationsPath } from "@/lib/lavorazioni/admin-notifications";
import { canPublishFattureScaduteDigest } from "@/lib/notifications/fatture-scadute-digest-eligible";
import { publishNotification } from "@/lib/notifications/publish-notification";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { shouldRunFattureScaduteDigestCheck } from "@/lib/notifications/scheduled-digest-timing";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import { invoicesService } from "@/src/services/invoices.service";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";

const CHECK_INTERVAL_MS = 60_000;

/** Bridge: digest giornaliero fatture scadute (09:00 feriali). */
export function AdminScheduledDigestNotificationBridge() {
  const { user } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const { mode, writesLegacy } = useNotificationsV2Mode();
  const pathname = usePathname() ?? "";
  const { push } = useToastContext();
  const checkInFlightRef = useRef(false);

  const staffEligible =
    !permsLoading &&
    isStaffInboxEligible(snapshot ? { ruolo: snapshot.role } : user, snapshot?.rbacContext);

  const runCheck = useCallback(async () => {
    const userId = user?.id;
    if (!staffEligible || !userId || checkInFlightRef.current) return;

    const today = todayDateYmd();
    checkInFlightRef.current = true;
    try {
      if (
        shouldRunFattureScaduteDigestCheck() &&
        canPublishFattureScaduteDigest(snapshot?.role ?? user?.ruolo)
      ) {
        const skipLegacy =
          writesLegacy &&
          Boolean(loadAdminNotificationStore(userId).items[fattureScaduteDigestStoreKey(today)]);
        if (!skipLegacy) {
          const res = await invoicesService.getList();
          if (res.success && res.data?.invoices) {
            const payload = buildFattureScaduteDigestPayload(res.data.invoices);
            if (payload) {
              const notification = buildFattureScaduteDigestNotification(payload);
              const result = await publishNotification(userId, notification, mode);
              if (result.added && !isDashboardNotificationsPath(pathname) && !isFatturazioneNotificationsPath(pathname)) {
                push(formatFattureScaduteDigestBody(payload), "info", 5000);
              }
            }
          }
        }
      }
    } finally {
      checkInFlightRef.current = false;
    }
  }, [mode, pathname, push, snapshot?.role, staffEligible, user?.id, user?.ruolo, writesLegacy]);

  useEffect(() => {
    if (!staffEligible || permsLoading || !user?.id) return;
    void runCheck();
    const id = window.setInterval(() => void runCheck(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [permsLoading, runCheck, staffEligible, user?.id]);

  return null;
}
