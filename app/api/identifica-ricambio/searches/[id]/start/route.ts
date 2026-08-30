import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runPartSearchForId } from "@/lib/ai/spare-parts/workers/spare-parts-worker.server";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { verifyServerPageWrite } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { sparePartSearchInputSchema } from "@/lib/ai/spare-parts/types/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

function createPartSearchAdminClient() {
  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) return null;
  const { url } = assertSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const allowed = await verifyServerPageWrite("identifica_ricambio");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const sb = await createSupabaseServerUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: search } = await sb
    .from("ai_part_searches")
    .select("id, status, input_json, created_by")
    .eq("id", id)
    .maybeSingle();

  if (!search) return NextResponse.json({ error: "Ricerca non trovata" }, { status: 404 });
  if (search.created_by !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (search.status !== "draft") {
    return NextResponse.json({ error: "Ricerca già avviata" }, { status: 409 });
  }

  const { data: assets } = await sb
    .from("ai_part_search_assets")
    .select("storage_path")
    .eq("search_id", id);

  const baseInput =
    search.input_json && typeof search.input_json === "object"
      ? (search.input_json as Record<string, unknown>)
      : {};
  const description =
    typeof baseInput.description === "string" ? baseInput.description.trim() : "";
  const hasPhotos = (assets?.length ?? 0) > 0;

  if (!hasPhotos && !description) {
    return NextResponse.json(
      { error: "Inserisci una descrizione o carica almeno una foto prima di avviare" },
      { status: 400 },
    );
  }

  const merged = sparePartSearchInputSchema.parse({
    ...baseInput,
    assetStoragePaths: hasPhotos ? assets!.map((a) => a.storage_path as string) : [],
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

  const admin = createPartSearchAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Worker identificazione non configurato (SUPABASE_SERVICE_ROLE_KEY). Impossibile elaborare la ricerca.",
      },
      { status: 503 },
    );
  }

  try {
    await runPartSearchForId(admin, id, merged);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Elaborazione ricerca fallita";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "completed" });
}
