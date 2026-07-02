"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useToastContext } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import {
  isDashboardNotificationsPath,
  isDipendentiNotificationsPath,
  shouldShowLightLavorazioneAlert,
} from "@/lib/lavorazioni/admin-notifications";
import { loadAdminNotificationStore } from "@/lib/lavorazioni/admin-notification-store";
import { publishNotification } from "@/lib/notifications/publish-notification";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import {
  buildDipendentiPresenzeReminderNotification,
  DIPENDENTI_PRESENZE_REMINDER_TOAST,
  dipendentiPresenzeReminderStoreKey,
  hasAnyPresenzeRecorded,
  shouldRunDipendentiPresenzeReminderCheck,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import { dipendentiTimesheetService } from "@/src/services/dipendenti-timesheet.service";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Promemoria: alle 17:00 nei giorni feriali, se non ci sono presenze per oggi.
 */
export function AdminDipendentiPresenzeReminderBridge() {
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
    if (!shouldRunDipendentiPresenzeReminderCheck()) return;

    const today = todayDateYmd();
    if (writesLegacy) {
      const store = loadAdminNotificationStore(userId);
      if (store.items[dipendentiPresenzeReminderStoreKey(today)]) return;
    }

    checkInFlightRef.current = true;
    try {
      const res = await dipendentiTimesheetService.listEntriesForRange(today, today);
      if (!res.success) return;
      if (hasAnyPresenzeRecorded(res.data ?? [])) return;

      const notification = buildDipendentiPresenzeReminderNotification(today);
      await publishNotification(userId, notification, mode);

      if (isDashboardNotificationsPath(pathname)) return;

      if (shouldShowLightLavorazioneAlert(pathname)) {
        push(DIPENDENTI_PRESENZE_REMINDER_TOAST, "info", 6000);
      }
    } finally {
      checkInFlightRef.current = false;
    }
  }, [mode, pathname, push, staffEligible, user?.id, writesLegacy]);

  useEffect(() => {
    if (!staffEligible || permsLoading || !user?.id) return;
    void runCheck();
    const id = window.setInterval(() => void runCheck(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [permsLoading, runCheck, staffEligible, user?.id]);

  useEffect(() => {
    if (!staffEligible || permsLoading || !user?.id) return;
    if (!isDipendentiNotificationsPath(pathname)) return;
    void runCheck();
  }, [pathname, permsLoading, runCheck, staffEligible, user?.id]);

  return null;
}
