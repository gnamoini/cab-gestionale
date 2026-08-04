"use client";

import type { AdminDashboardNotification } from "@/lib/notifications/admin-dashboard-notifications";
import type { DispatchNotificationBody } from "@/lib/notifications/preferences/notification-preferences-api";

export class NotificationDispatchApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "NotificationDispatchApiError";
    this.status = status;
  }
}

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
    const detail = await res.text().catch(() => "");
    throw new NotificationDispatchApiError(
      res.status,
      `[notifications] dispatch API failed (${res.status}): ${detail || res.statusText}`,
    );
  }

  return (await res.json()) as { created: number; skipped: number; duplicate: boolean };
}
