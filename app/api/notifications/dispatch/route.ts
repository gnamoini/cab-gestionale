import { NextResponse } from "next/server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { resolveServerEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions.server";
import { dispatchNotificationEvent } from "@/lib/notifications/dispatch/notification-dispatch-service.server";
import { buildDispatchCommandFromLegacy } from "@/lib/notifications/dispatch/build-dispatch-command.server";
import type { AdminDashboardNotification } from "@/lib/notifications/admin-dashboard-notifications";
import type { DispatchNotificationBody } from "@/lib/notifications/preferences/notification-preferences-api";
import { getNotificationRegistryEntry } from "@/lib/notifications/notification-event-catalog";

export async function POST(req: Request) {
  const snap = await resolveServerEffectivePermissions();
  if (
    !snap?.userId ||
    !isStaffInboxEligible({ id: snap.userId, ruolo: snap.role }, { resolved: snap.resolved })
  ) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const body = (await req.json()) as DispatchNotificationBody & {
    legacyNotification?: AdminDashboardNotification;
  };

  if (!body.notificationEventId || !body.dispatchIdempotencyKey || !body.legacyNotification) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const entry = getNotificationRegistryEntry(body.notificationEventId);
  if (!entry) {
    return NextResponse.json({ error: "Evento sconosciuto" }, { status: 400 });
  }

  const client = await createSupabaseServerUserClient();
  const { data: profile } = await client
    .from("profiles")
    .select("company_id")
    .eq("id", snap.userId)
    .maybeSingle();

  const companyId = (profile as { company_id?: string } | null)?.company_id;
  if (!companyId) {
    return NextResponse.json({ error: "Company non trovata" }, { status: 400 });
  }

  const buildCommand = buildDispatchCommandFromLegacy(
    body.notificationEventId,
    body.actorId ?? snap.userId,
    body.legacyNotification,
  );

  try {
    const result = await dispatchNotificationEvent({
      notificationEventId: body.notificationEventId,
      companyId,
      actorId: body.actorId ?? snap.userId,
      excludeActor: body.excludeActor,
      dispatchIdempotencyKey: body.dispatchIdempotencyKey,
      buildCommand: (recipientId) => buildCommand(recipientId)!,
    });

    return NextResponse.json({
      created: result.created,
      skipped: result.skipped,
      duplicate: result.duplicate,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore dispatch";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
