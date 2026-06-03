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
import {
  getUnreadCount,
  loadAdminNotificationStore,
} from "@/lib/lavorazioni/admin-notification-store";
import { publishAdminDashboardNotification } from "@/lib/notifications/admin-dashboard-desktop";
import {
  buildDipendentiPresenzeReminderNotification,
  DIPENDENTI_PRESENZE_REMINDER_TOAST,
  dipendentiPresenzeReminderStoreKey,
  hasAnyPresenzeRecorded,
  shouldRunDipendentiPresenzeReminderCheck,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import { dipendentiTimesheetService } from "@/src/services/dipendenti-timesheet.service";
import { usePermissions } from "@/src/hooks/use-permissions";

const CHECK_INTERVAL_MS = 60_000;

function applyUnreadDocumentTitle(userId: string): void {
  if (typeof document === "undefined") return;
  const count = getUnreadCount(loadAdminNotificationStore(userId));
  if (count <= 0) return;
  const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
  document.title = `(${count}) ${base}`;
}

/**
 * Promemoria admin: alle 17:00 nei giorni feriali, se non ci sono presenze per oggi.
 */
export function AdminDipendentiPresenzeReminderBridge() {
  const { user } = useAuth();
  const { isAdmin, isLoading } = usePermissions();
  const pathname = usePathname() ?? "";
  const { push } = useToastContext();
  const checkInFlightRef = useRef(false);

  const runCheck = useCallback(async () => {
    const userId = user?.id;
    if (!isAdmin || !userId || checkInFlightRef.current) return;
    if (!shouldRunDipendentiPresenzeReminderCheck()) return;

    const today = todayDateYmd();
    const store = loadAdminNotificationStore(userId);
    if (store.items[dipendentiPresenzeReminderStoreKey(today)]) return;

    checkInFlightRef.current = true;
    try {
      const res = await dipendentiTimesheetService.listEntriesForRange(today, today);
      if (!res.success) return;
      if (hasAnyPresenzeRecorded(res.data ?? [])) return;

      const notification = buildDipendentiPresenzeReminderNotification(today);
      void publishAdminDashboardNotification(userId, notification).then(() => {
        applyUnreadDocumentTitle(userId);
      });

      if (isDashboardNotificationsPath(pathname)) return;

      if (shouldShowLightLavorazioneAlert(pathname)) {
        push(DIPENDENTI_PRESENZE_REMINDER_TOAST, "info", 6000);
      }
    } finally {
      checkInFlightRef.current = false;
    }
  }, [isAdmin, pathname, push, user?.id]);

  useEffect(() => {
    if (!isAdmin || isLoading || !user?.id) return;
    void runCheck();
    const id = window.setInterval(() => void runCheck(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isAdmin, isLoading, runCheck, user?.id]);

  useEffect(() => {
    if (!isAdmin || isLoading || !user?.id) return;
    if (!isDipendentiNotificationsPath(pathname)) return;
    void runCheck();
  }, [isAdmin, isLoading, pathname, runCheck, user?.id]);

  return null;
}
