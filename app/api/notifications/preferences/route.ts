import { NextResponse } from "next/server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import {
  loadNotificationSettingsViewModelForUser,
  requireNotificationPreferencesSession,
} from "@/lib/notifications/preferences/notification-preferences-server";

export async function GET() {
  const session = await requireNotificationPreferencesSession();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const client = await createSupabaseServerUserClient();
  const vm = await loadNotificationSettingsViewModelForUser(client, session);
  if (!vm) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  return NextResponse.json(vm);
}
