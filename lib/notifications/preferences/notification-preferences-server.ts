import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { buildNotificationSettingsViewModel } from "@/lib/notifications/preferences/build-settings-view-model";
import { loadEventPreferencesForUsers } from "@/lib/notifications/preferences/load-event-preferences.server";
import { CONFIGURABLE_NOTIFICATION_EVENT_IDS } from "@/lib/notifications/notification-event-catalog";
import { resolveEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions";
import { fetchOperatorGlobalSettingsDbEnabledServer } from "@/lib/permissions/operator-global-settings-server";
import type { NotificationSettingsViewModel } from "@/lib/notifications/preferences/notification-preferences-api";

export type NotificationPreferencesSession = {
  userId: string;
  companyId: string;
};

export async function requireNotificationPreferencesSession(): Promise<NotificationPreferencesSession | null> {
  const session = await getServerSession();
  if (!session.user?.id) return null;

  const sb = await createSupabaseServerUserClient();
  const { data: profile } = await sb
    .from("profiles")
    .select("company_id")
    .eq("id", session.user.id)
    .maybeSingle();

  const companyId = (profile as { company_id?: string } | null)?.company_id;
  if (!companyId) return null;

  return { userId: session.user.id, companyId };
}

export async function loadNotificationSettingsViewModelForUser(
  client: SupabaseClient,
  session: NotificationPreferencesSession,
): Promise<NotificationSettingsViewModel | null> {
  const serverSession = await getServerSession();
  if (!serverSession.user?.id) return null;

  const pilotDbEnabled = await fetchOperatorGlobalSettingsDbEnabledServer();
  const effective = resolveEffectivePermissions({
    userId: session.userId,
    roleKey: serverSession.user.roleKey ?? serverSession.user.ruolo,
    rolePageAccess: serverSession.rolePageAccess,
    userPageOverrideRows: serverSession.userPageOverrides,
    pilotDbEnabled,
    permissionsHydrated: true,
  });

  if (!effective.resolved) return { pages: [] };

  const preferenceRows = await loadEventPreferencesForUsers(client, {
    companyId: session.companyId,
    userIds: [session.userId],
    notificationEventIds: [...CONFIGURABLE_NOTIFICATION_EVENT_IDS],
  });

  return buildNotificationSettingsViewModel({
    resolved: effective.resolved,
    companyId: session.companyId,
    preferenceRows,
  });
}
