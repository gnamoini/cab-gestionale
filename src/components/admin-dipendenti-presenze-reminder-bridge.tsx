"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useToastContext } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import { isDipendentiNotificationsPath } from "@/lib/lavorazioni/admin-notifications";
import { loadAdminNotificationStore } from "@/lib/lavorazioni/admin-notification-store";
import { publishNotification } from "@/lib/notifications/publish-notification";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import {
  buildDipendentiPresenzeReminderNotification,
  buildDipendentiPresenzeReminderPayload,
  dipendentiPresenzeReminderStoreKey,
  formatDipendentiPresenzeReminderBody,
  shouldRunDipendentiPresenzeReminderCheck,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import { dipendentiTimesheetService } from "@/src/services/dipendenti-timesheet.service";
import { useNotificationsV2Mode } from "@/src/hooks/gestionale/use-notifications-v2-mode";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { canReadModule } from "@/src/lib/rbac/resolve-user-permissions";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Promemoria: alle 17:00 nei giorni feriali, se dipendenti attivi senza presenze per oggi.
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

  const canReadDipendenti =
    Boolean(snapshot?.resolved) && canReadModule(snapshot!.resolved, "dipendenti");

  const runCheck = useCallback(async () => {
    const userId = user?.id;
    if (!staffEligible || !canReadDipendenti || !userId || checkInFlightRef.current) return;
    if (!shouldRunDipendentiPresenzeReminderCheck()) return;

    const today = todayDateYmd();
    if (writesLegacy) {
      const store = loadAdminNotificationStore(userId);
      if (store.items[dipendentiPresenzeReminderStoreKey(today)]) return;
    }

    checkInFlightRef.current = true;
    try {
      const [employeesRes, entriesRes] = await Promise.all([
        dipendentiTimesheetService.listEmployees(),
        dipendentiTimesheetService.listEntriesForRange(today, today),
      ]);
      if (!employeesRes.success || !entriesRes.success) return;

      const payload = buildDipendentiPresenzeReminderPayload(
        employeesRes.data ?? [],
        entriesRes.data ?? [],
        today,
      );
      if (!payload) return;

      const notification = buildDipendentiPresenzeReminderNotification(payload);
      const result = await publishNotification(userId, notification, mode);

      if (result.added && !isDipendentiNotificationsPath(pathname)) {
        push(formatDipendentiPresenzeReminderBody(payload), "info", 6000);
      }
    } finally {
      checkInFlightRef.current = false;
    }
  }, [canReadDipendenti, mode, pathname, push, staffEligible, user?.id, writesLegacy]);

  useEffect(() => {
    if (!staffEligible || !canReadDipendenti || permsLoading || !user?.id) return;
    void runCheck();
    const id = window.setInterval(() => void runCheck(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [canReadDipendenti, permsLoading, runCheck, staffEligible, user?.id]);

  useEffect(() => {
    if (!staffEligible || !canReadDipendenti || permsLoading || !user?.id) return;
    if (!isDipendentiNotificationsPath(pathname)) return;
    void runCheck();
  }, [canReadDipendenti, pathname, permsLoading, runCheck, staffEligible, user?.id]);

  return null;
}
