import { NextResponse } from "next/server";
import { verifyServerPageRead, verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { createPartSearch } from "@/lib/ai/spare-parts/queue/part-search-queue.server";
import { sparePartSearchInputSchema } from "@/lib/ai/spare-parts/types/schemas";
import { isSparePartsSearchRateLimited } from "@/lib/ai/spare-parts/api/spare-parts-rate-limit.server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const allowed = await verifyServerPageRead("identifica_ricambio");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("ai_part_searches")
    .select("id, status, created_at, confirmed_at, rejected_at, result_json")
    .eq("created_by", user.id)
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ searches: data ?? [] });
}

export async function POST(request: Request) {
  const allowed = await verifyServerPageWrite("identifica_ricambio");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (await isSparePartsSearchRateLimited(user.id)) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra qualche minuto." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const parsed = sparePartSearchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const searchId = await createPartSearch(sb, {
    userId: user.id,
    inputJson: parsed.data,
  });

  return NextResponse.json({ searchId, status: "draft" });
}
