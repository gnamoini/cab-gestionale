import "server-only";

import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await verifyServerModuleCan("document_capture", "read"))) {
    return NextResponse.json({ error: "Permesso richiesto" }, { status: 403 });
  }

  const url = new URL(request.url);
  const lavorazioneId = url.searchParams.get("lavorazioneId");

  const sb = await createSupabaseServerUserClient();
  let query = sb
    .from("document_capture")
    .select(
      "id, status, file_name, mime, document_category, scheda_tipo, finalized_at, duplicate_of, uploaded_at, lavorazione_id",
    )
    .order("uploaded_at", { ascending: false })
    .limit(100);

  if (lavorazioneId) {
    query = query.eq("lavorazione_id", lavorazioneId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ captures: data ?? [] });
}
