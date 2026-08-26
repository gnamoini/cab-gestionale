import { NextResponse } from "next/server";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import { processPartSearchQueueOnly } from "@/lib/ai/spare-parts/workers/spare-parts-worker.server";
import { sparePartSearchInputSchema } from "@/lib/ai/spare-parts/types/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const allowed = await verifyServerPageWrite("identifica_ricambio");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();

  const { data: search } = await sb
    .from("ai_part_searches")
    .select("id, status, input_json")
    .eq("id", id)
    .maybeSingle();

  if (!search) return NextResponse.json({ error: "Ricerca non trovata" }, { status: 404 });
  if (search.status !== "draft") {
    return NextResponse.json({ error: "Ricerca già avviata" }, { status: 409 });
  }

  const { data: assets } = await sb
    .from("ai_part_search_assets")
    .select("storage_path")
    .eq("search_id", id);

  if (!assets?.length) {
    return NextResponse.json({ error: "Carica almeno una foto prima di avviare" }, { status: 400 });
  }

  const baseInput =
    search.input_json && typeof search.input_json === "object"
      ? (search.input_json as Record<string, unknown>)
      : {};
  const merged = sparePartSearchInputSchema.parse({
    ...baseInput,
    assetStoragePaths: assets.map((a) => a.storage_path as string),
  });

  const { error } = await sb
    .from("ai_part_searches")
    .update({
      status: "pending",
      input_json: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "draft");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const serviceKey = readSupabaseServiceRoleKey();
  if (serviceKey) {
    const { url } = assertSupabasePublicEnv();
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    waitUntil(processPartSearchQueueOnly(admin));
  }

  return NextResponse.json({ ok: true, status: "pending" });
}
