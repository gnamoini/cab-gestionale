"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useToastContext } from "@/context/toast-context";
import { useAuth } from "@/context/auth-context";
import { buildWorkshopScheduleNotification } from "@/lib/workshop-schedule/workshop-schedule-notification-mapper";
import { isDashboardNotificationsPath, shouldShowLightLavorazioneAlert } from "@/lib/lavorazioni/admin-notifications";
import { createNotification } from "@/lib/notifications/create-notification";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { workshopScheduleService } from "@/src/services/workshop-schedule.service";
import { useEffectivePermissions } from "@/src/lib/runtime/truth-layer/use-effective-permissions";
import { ymdFromIso } from "@/lib/workshop-schedule/datetime";
import { computeDayCapacity } from "@/lib/workshop-schedule/day-capacity";
import { buildAgendaHref } from "@/lib/navigation/agenda-links";
import type { NotificationType } from "@/lib/notifications/notification-types";

const CHECK_INTERVAL_MS = 120_000;

function isAdminOrDirector(roleKey: string | undefined): boolean {
  return roleKey === "admin" || roleKey === "manager";
}

/**
 * Notifiche agenda officina — solo Admin + Direttore (manager).
 */
export function AdminWorkshopScheduleNotificationBridge() {
  const { user } = useAuth();
  const { snapshot, isLoading: permsLoading } = useEffectivePermissions();
  const pathname = usePathname() ?? "";
  const { push } = useToastContext();
  const checkInFlightRef = useRef(false);

  const canReceive =
    !permsLoading &&
    isStaffInboxEligible(snapshot ? { ruolo: snapshot.role } : user, snapshot?.rbacContext) &&
    isAdminOrDirector(snapshot?.roleKey);

  const runCheck = useCallback(async () => {
    const userId = user?.id;
    if (!canReceive || !userId || checkInFlightRef.current) return;
    checkInFlightRef.current = true;
    try {
      const now = new Date();
      const todayYmd = ymdFromIso(now.toISOString());
      const start = new Date(`${todayYmd}T00:00:00`).toISOString();
      const end = new Date(`${todayYmd}T23:59:59`).toISOString();
      const res = await workshopScheduleService.enrichedView(start, end);
      if (!res.success || !res.data) return;

      const sessions = res.data;
      const capacity = computeDayCapacity(todayYmd, sessions);
      const messages: string[] = [];

      if (capacity.saturationPct >= 90) {
        const n = buildWorkshopScheduleNotification({
          kind: "workshop_schedule_day_saturated",
          session: { id: "day", title: "Agenda", startAt: start, planningStatus: "scheduled" },
          detail: `Saturazione ${capacity.saturationPct}%`,
        });
        const result = await createNotification({
          type: n.type as NotificationType,
          title: n.title,
          body: n.body,
          href: buildAgendaHref({ date: todayYmd }),
          dedup_key: n.dedupKey,
        });
        if (result.inserted) messages.push(n.title);
      }

      for (const s of sessions) {
        if (s.planningStatus === "cancelled" || s.planningStatus === "completed") continue;
        if (new Date(s.endAt) >= now) continue;
        const n = buildWorkshopScheduleNotification({ kind: "workshop_schedule_overdue", session: s });
        const result = await createNotification({
          type: n.type as NotificationType,
          title: n.title,
          body: n.body,
          href: n.href,
          dedup_key: n.dedupKey,
          entity_type: "workshop_schedule_events",
          entity_id: s.id,
        });
        if (result.inserted) messages.push(n.title);
      }

      if (messages.length === 0 || isDashboardNotificationsPath(pathname)) return;
      if (shouldShowLightLavorazioneAlert(pathname)) {
        push(messages[0] ?? "Aggiornamento agenda", "info", 6000);
      }
    } finally {
      checkInFlightRef.current = false;
    }
  }, [canReceive, pathname, push, user?.id]);

  useEffect(() => {
    if (!canReceive || !user?.id) return;
    void runCheck();
    const id = window.setInterval(() => void runCheck(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [canReceive, runCheck, user?.id]);

  return null;
}
