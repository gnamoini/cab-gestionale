import type { NotificationEventDefinition } from "@/lib/notifications/notification-event-catalog";

export type EventPreferenceOverrideMap = ReadonlyMap<string, boolean>;

function overrideKey(userId: string, companyId: string, notificationEventId: string): string {
  return `${userId}:${companyId}:${notificationEventId}`;
}

export function buildEventPreferenceOverrideMap(
  rows: readonly { user_id: string; company_id: string; notification_event_id: string; enabled: boolean }[],
): EventPreferenceOverrideMap {
  const map = new Map<string, boolean>();
  for (const row of rows) {
    map.set(overrideKey(row.user_id, row.company_id, row.notification_event_id), row.enabled);
  }
  return map;
}

export function isNotificationEventEnabled(input: {
  notificationEventId: string;
  userId: string;
  companyId: string;
  entry: NotificationEventDefinition;
  overrides: EventPreferenceOverrideMap;
}): boolean {
  const { entry, notificationEventId, userId, companyId, overrides } = input;
  if (entry.notificationMode === "mandatory") return true;
  const override = overrides.get(overrideKey(userId, companyId, notificationEventId));
  if (override !== undefined) return override;
  return entry.defaultEnabled;
}
