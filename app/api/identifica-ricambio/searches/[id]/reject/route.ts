import { NextResponse } from "next/server";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const allowed = await verifyServerPageWrite("identifica_ricambio");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();

  let body: { note?: string } = {};
  try {
    body = (await request.json()) as { note?: string };
  } catch {
    /* empty */
  }

  const { error } = await sb
    .from("ai_part_searches")
    .update({
      rejected_at: new Date().toISOString(),
      rejection_note: body.note?.slice(0, 500) ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
