import { NextResponse } from "next/server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";
import { auditNotificationPreferenceChange } from "@/lib/notifications/preferences/audit-notification-preference.server";
import { loadEventPreferencesForUsers } from "@/lib/notifications/preferences/load-event-preferences.server";
import { requireNotificationPreferencesSession } from "@/lib/notifications/preferences/notification-preferences-server";
import type { PatchNotificationPreferenceBody } from "@/lib/notifications/preferences/notification-preferences-api";

type RouteContext = { params: Promise<{ notificationEventId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  const session = await requireNotificationPreferencesSession();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { notificationEventId } = await context.params;
  const entry = getNotificationRegistryEntry(notificationEventId);
  if (!entry?.userConfigurable || entry.notificationMode === "mandatory") {
    return NextResponse.json({ error: "Evento non configurabile" }, { status: 400 });
  }

  const body = (await req.json()) as PatchNotificationPreferenceBody;
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const client = await createSupabaseServerUserClient();
  const existing = await loadEventPreferencesForUsers(client, {
    companyId: session.companyId,
    userIds: [session.userId],
    notificationEventIds: [notificationEventId],
  });
  const beforeRow = existing[0];
  const beforeEnabled = beforeRow
    ? { enabled: beforeRow.enabled }
    : { enabled: entry.defaultEnabled };

  const { error } = await client.from("notification_event_preferences").upsert(
    {
      user_id: session.userId,
      company_id: session.companyId,
      notification_event_id: notificationEventId,
      enabled: body.enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,company_id,notification_event_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await auditNotificationPreferenceChange(client, {
    userId: session.userId,
    companyId: session.companyId,
    notificationEventId,
    before: beforeEnabled,
    after: { enabled: body.enabled },
    action: "UPDATE",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await requireNotificationPreferencesSession();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { notificationEventId } = await context.params;
  const entry = getNotificationRegistryEntry(notificationEventId);
  if (!entry?.userConfigurable || entry.notificationMode === "mandatory") {
    return NextResponse.json({ error: "Evento non configurabile" }, { status: 400 });
  }

  const client = await createSupabaseServerUserClient();
  const existing = await loadEventPreferencesForUsers(client, {
    companyId: session.companyId,
    userIds: [session.userId],
    notificationEventIds: [notificationEventId],
  });
  const beforeRow = existing[0];

  const { error } = await client
    .from("notification_event_preferences")
    .delete()
    .eq("user_id", session.userId)
    .eq("company_id", session.companyId)
    .eq("notification_event_id", notificationEventId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (beforeRow) {
    await auditNotificationPreferenceChange(client, {
      userId: session.userId,
      companyId: session.companyId,
      notificationEventId,
      before: { enabled: beforeRow.enabled },
      after: { enabled: entry.defaultEnabled },
      action: "DELETE",
    });
  }

  return NextResponse.json({ ok: true });
}
