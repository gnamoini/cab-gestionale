import "server-only";

import { NextResponse } from "next/server";
import { isStaffInboxEligible } from "@/lib/notifications/staff-inbox-eligible";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { resolveServerEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { getCachedPublishedSnapshot } from "@/lib/domain/technical-knowledge-base/cache/tkb-snapshot-cache.server";

export async function GET() {
  const snap = await resolveServerEffectivePermissions();
  if (!snap?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canReadTkb =
    (await verifyServerPageRead("impostazioni")) ||
    isStaffInboxEligible({ id: snap.userId, ruolo: snap.role }, { resolved: snap.resolved });
  if (!canReadTkb) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createSupabaseServerUserClient();

  const snapshot = await getCachedPublishedSnapshot(supabase);
  if (!snapshot) return NextResponse.json({ kbVersion: null, snapshot: null });
  return NextResponse.json({ kbVersion: snapshot.kbVersion, snapshot });
}
