import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEventPreferenceOverrideMap } from "@/lib/notifications/preferences/notification-preference-resolver";

export type NotificationEventPreferenceRow = {
  user_id: string;
  company_id: string;
  notification_event_id: string;
  enabled: boolean;
};

export async function loadEventPreferencesForUsers(
  client: SupabaseClient,
  input: {
    companyId: string;
    userIds: string[];
    notificationEventIds: string[];
  },
): Promise<NotificationEventPreferenceRow[]> {
  const { companyId, userIds, notificationEventIds } = input;
  if (!userIds.length || !notificationEventIds.length) return [];

  const { data, error } = await client
    .from("notification_event_preferences")
    .select("user_id, company_id, notification_event_id, enabled")
    .eq("company_id", companyId)
    .in("user_id", userIds)
    .in("notification_event_id", notificationEventIds);

  if (error) {
    console.warn("[notifications] loadEventPreferencesForUsers:", error.message);
    return [];
  }
  return (data ?? []) as NotificationEventPreferenceRow[];
}

export function toPreferenceOverrideMap(rows: NotificationEventPreferenceRow[]) {
  return buildEventPreferenceOverrideMap(rows);
}
