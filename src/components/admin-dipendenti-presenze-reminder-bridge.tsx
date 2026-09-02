"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useToastContext } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import { isDipendentiNotificationsPath } from "@/lib/lavorazioni/admin-notifications";
import {
  buildDipendentiPresenzeReminderPayload,
  formatDipendentiPresenzeReminderBody,
  shouldRunDipendentiPresenzeReminderCheck,
} from "@/lib/dipendenti/dipendenti-presenze-reminder";
import { todayDateYmd } from "@/lib/dipendenti/timesheet-month";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { dipendentiTimesheetService } from "@/src/services/dipendenti-timesheet.service";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { canReadPage } from "@/src/lib/rbac/resolve-page-access";
import {
  hasDipendentiPresenzeToastBeenShown,
  markDipendentiPresenzeToastShown,
} from "@/lib/dipendenti/dipendenti-presenze-toast-dedup";

const CHECK_INTERVAL_MS = 60_000;

/** Toast UX opzionale — inbox via cron server dipendenti-presenze-reminder. */
export function AdminDipendentiPresenzeReminderBridge() {
  const { user } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const pathname = usePathname() ?? "";
  const { push } = useToastContext();
  const checkInFlightRef = useRef(false);

  const staffEligible =
    !permsLoading &&
    isStaffInboxEligible(snapshot ? { ruolo: snapshot.role } : user, snapshot?.rbacContext);

  const canReadDipendenti =
    Boolean(snapshot?.resolved) && canReadPage(snapshot!.resolved, "dipendenti");

  const runCheck = useCallback(async () => {
    if (!staffEligible || !canReadDipendenti || !user?.id || checkInFlightRef.current) return;
    if (!shouldRunDipendentiPresenzeReminderCheck()) return;

    checkInFlightRef.current = true;
    try {
      const today = todayDateYmd();
      if (hasDipendentiPresenzeToastBeenShown(user.id, today)) return;

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

      if (!isDipendentiNotificationsPath(pathname)) {
        markDipendentiPresenzeToastShown(user.id, today);
        push(formatDipendentiPresenzeReminderBody(payload), "info", 6000);
      }
    } finally {
      checkInFlightRef.current = false;
    }
  }, [canReadDipendenti, pathname, push, staffEligible, user?.id]);

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
