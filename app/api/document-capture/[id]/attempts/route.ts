import { NextResponse } from "next/server";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!(await verifyServerModuleCan("document_capture", "read"))) {
    return NextResponse.json({ error: "Permesso richiesto" }, { status: 403 });
  }

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("document_capture_attempts")
    .select("*")
    .eq("document_capture_id", id)
    .order("started_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ attempts: data ?? [] });
}
