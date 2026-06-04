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
import {
  getUnreadCount,
  loadAdminNotificationStore,
} from "@/lib/lavorazioni/admin-notification-store";
import { publishAdminDashboardNotification } from "@/lib/notifications/admin-dashboard-desktop";
import { dashboardPromemoriaService } from "@/src/services/dashboard-promemoria.service";
import { useRbac } from "@/src/hooks/use-rbac";

const CHECK_INTERVAL_MS = 60_000;

function applyUnreadDocumentTitle(userId: string): void {
  if (typeof document === "undefined") return;
  const count = getUnreadCount(loadAdminNotificationStore(userId));
  if (count <= 0) return;
  const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
  document.title = `(${count}) ${base}`;
}

/**
 * Promemoria calendario: notifica per ogni evento di oggi al momento opportuno (09:00 o 30 min prima se c'è orario).
 * Richiede app aperta — stesso modello del promemoria presenze dipendenti.
 */
export function AdminDashboardPromemoriaReminderBridge() {
  const { user } = useAuth();
  const rbac = useRbac();
  const pathname = usePathname() ?? "";
  const { push } = useToastContext();
  const checkInFlightRef = useRef(false);

  const canReceive = rbac.canRead("dashboard");

  const runCheck = useCallback(async () => {
    const userId = user?.id;
    if (!canReceive || !userId || checkInFlightRef.current) return;

    checkInFlightRef.current = true;
    try {
      const res = await dashboardPromemoriaService.listDueTodayForReminder();
      if (!res.success || !res.data?.length) return;

      const store = loadAdminNotificationStore(userId);
      const now = new Date();
      const newToastMessages: string[] = [];

      for (const row of res.data) {
        if (!shouldNotifyPromemoriaNow(row, now)) continue;
        const notification = buildDashboardPromemoriaReminderNotification(row);
        if (store.items[notification.id]) continue;

        await publishAdminDashboardNotification(userId, notification);
        await dashboardPromemoriaService.markNotified(row.id, row.event_date);
        newToastMessages.push(notification.message);
      }

      if (newToastMessages.length === 0) return;

      applyUnreadDocumentTitle(userId);

      if (isDashboardNotificationsPath(pathname)) return;
      if (shouldShowLightLavorazioneAlert(pathname)) {
        push(formatDashboardPromemoriaReminderToastMessage(newToastMessages), "info", 6000);
      }
    } finally {
      checkInFlightRef.current = false;
    }
  }, [canReceive, pathname, push, user?.id]);

  useEffect(() => {
    if (!canReceive || rbac.isLoading || !user?.id) return;
    void runCheck();
    const id = window.setInterval(() => void runCheck(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [canReceive, rbac.isLoading, runCheck, user?.id]);

  useEffect(() => {
    if (!canReceive || rbac.isLoading || !user?.id) return;
    if (!isDashboardNotificationsPath(pathname)) return;
    void runCheck();
  }, [canReceive, pathname, rbac.isLoading, runCheck, user?.id]);

  return null;
}
