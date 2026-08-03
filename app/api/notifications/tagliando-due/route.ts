import { NextResponse } from "next/server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { resolveServerEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions.server";
import {
  maybePublishTagliandoDueOnInterventoCreateServer,
  type MaybePublishTagliandoDueServerInput,
} from "@/lib/maintenance-plans/tagliando-due-notification.server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const snap = await resolveServerEffectivePermissions();
  if (
    !snap?.userId ||
    !isStaffInboxEligible({ id: snap.userId, ruolo: snap.role }, { resolved: snap.resolved })
  ) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const body = (await req.json()) as MaybePublishTagliandoDueServerInput;
  if (!body?.lavorazioneId?.trim() || !body?.mezzoId?.trim()) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const client = await createSupabaseServerUserClient();
  await maybePublishTagliandoDueOnInterventoCreateServer(client, body);
  return NextResponse.json({ ok: true });
}
