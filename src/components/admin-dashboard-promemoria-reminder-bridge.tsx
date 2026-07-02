"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useToastContext } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import {
  buildDashboardPromemoriaReminderNotification,
  formatDashboardPromemoriaReminderToastMessage,
  shouldNotifyPromemoriaNow,
} from "@/lib/dashboard/dashboard-promemoria-reminder";
import {
  isDashboardNotificationsPath,
  shouldShowLightLavorazioneAlert,
} from "@/lib/lavorazioni/admin-notifications";
import { loadAdminNotificationStore } from "@/lib/lavorazioni/admin-notification-store";
import { publishNotification } from "@/lib/notifications/publish-notification";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { dashboardPromemoriaService } from "@/src/services/dashboard-promemoria.service";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Promemoria calendario: notifica per ogni evento di oggi al momento opportuno.
 */
export function AdminDashboardPromemoriaReminderBridge() {
  const { user } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const { mode, writesLegacy } = useNotificationsV2Mode();
  const pathname = usePathname() ?? "";
  const { push } = useToastContext();
  const checkInFlightRef = useRef(false);

  const canReceive =
    !permsLoading &&
    isStaffInboxEligible(snapshot ? { ruolo: snapshot.role } : user, snapshot?.rbacContext);

  const runCheck = useCallback(async () => {
    const userId = user?.id;
    if (!canReceive || !userId || checkInFlightRef.current) return;

    checkInFlightRef.current = true;
    try {
      const res = await dashboardPromemoriaService.listDueTodayForReminder();
      if (!res.success || !res.data?.length) return;

      const now = new Date();
      const newToastMessages: string[] = [];

      for (const row of res.data) {
        if (!shouldNotifyPromemoriaNow(row, now)) continue;
        const notification = buildDashboardPromemoriaReminderNotification(row);
        if (writesLegacy) {
          const legacyStore = loadAdminNotificationStore(userId);
          if (legacyStore.items[notification.id]) continue;
        }

        const marked = await dashboardPromemoriaService.markNotified(row.id, row.event_date);
        if (!marked.success) continue;

        const { added } = await publishNotification(userId, notification, mode);
        if (added) newToastMessages.push(notification.message);
      }

      if (newToastMessages.length === 0) return;

      if (isDashboardNotificationsPath(pathname)) return;
      if (shouldShowLightLavorazioneAlert(pathname)) {
        push(formatDashboardPromemoriaReminderToastMessage(newToastMessages), "info", 6000);
      }
    } finally {
      checkInFlightRef.current = false;
    }
  }, [canReceive, mode, pathname, push, user?.id, writesLegacy]);

  useEffect(() => {
    if (!canReceive || permsLoading || !user?.id) return;
    void runCheck();
    const id = window.setInterval(() => void runCheck(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [canReceive, permsLoading, runCheck, user?.id]);

  useEffect(() => {
    if (!canReceive || permsLoading || !user?.id) return;
    if (!isDashboardNotificationsPath(pathname)) return;
    void runCheck();
  }, [canReceive, pathname, permsLoading, runCheck, user?.id]);

  return null;
}
