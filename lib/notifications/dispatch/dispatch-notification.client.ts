"use client";

import type { AdminDashboardNotification } from "@/lib/notifications/admin-dashboard-notifications";
import type { DispatchNotificationBody } from "@/lib/notifications/preferences/notification-preferences-api";

export async function dispatchNotificationViaApi(input: {
  notificationEventId: string;
  dispatchIdempotencyKey: string;
  actorId?: string;
  excludeActor?: boolean;
  legacyNotification: AdminDashboardNotification;
}): Promise<{ created: number; skipped: number; duplicate: boolean }> {
  const body: DispatchNotificationBody & { legacyNotification: AdminDashboardNotification } = {
    notificationEventId: input.notificationEventId,
    dispatchIdempotencyKey: input.dispatchIdempotencyKey,
    actorId: input.actorId,
    excludeActor: input.excludeActor,
    payload: {},
    legacyNotification: input.legacyNotification,
  };

  const res = await fetch("/api/notifications/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.warn("[notifications] dispatch API failed:", res.status);
    return { created: 0, skipped: 0, duplicate: false };
  }

  return (await res.json()) as { created: number; skipped: number; duplicate: boolean };
}
