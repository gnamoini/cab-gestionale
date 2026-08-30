import { NextResponse } from "next/server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const allowed = await verifyServerPageRead("identifica_ricambio");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: search } = await sb
    .from("ai_part_searches")
    .select("id, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (search.created_by !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await sb
    .from("ai_part_candidates")
    .select("id, rank_order, is_best_match")
    .eq("search_id", id)
    .order("rank_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    candidates: (data ?? []).map((c) => ({
      id: c.id,
      rankOrder: c.rank_order,
      isBestMatch: c.is_best_match,
    })),
  });
}
