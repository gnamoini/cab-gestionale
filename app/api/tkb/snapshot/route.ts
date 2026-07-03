import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { getCachedPublishedSnapshot } from "@/lib/domain/technical-knowledge-base/cache/tkb-snapshot-cache.server";

export async function GET() {
  const supabase = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await getCachedPublishedSnapshot(supabase);
  if (!snapshot) return NextResponse.json({ kbVersion: null, snapshot: null });
  return NextResponse.json({ kbVersion: snapshot.kbVersion, snapshot });
}
