import { NextResponse } from "next/server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { auditNotificationPreferenceChange } from "@/lib/notifications/preferences/audit-notification-preference.server";
import { requireNotificationPreferencesSession } from "@/lib/notifications/preferences/notification-preferences-server";

export async function DELETE() {
  const session = await requireNotificationPreferencesSession();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const client = await createSupabaseServerUserClient();
  const { data: existing } = await client
    .from("notification_event_preferences")
    .select("notification_event_id, enabled")
    .eq("user_id", session.userId)
    .eq("company_id", session.companyId);

  const { error } = await client
    .from("notification_event_preferences")
    .delete()
    .eq("user_id", session.userId)
    .eq("company_id", session.companyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const row of existing ?? []) {
    await auditNotificationPreferenceChange(client, {
      userId: session.userId,
      companyId: session.companyId,
      notificationEventId: row.notification_event_id as string,
      before: { enabled: row.enabled as boolean },
      after: null,
      action: "RESTORE_ALL",
    });
  }

  return NextResponse.json({ ok: true, restored: (existing ?? []).length });
}
