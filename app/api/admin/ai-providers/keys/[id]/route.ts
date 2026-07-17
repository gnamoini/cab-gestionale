import { NextResponse } from "next/server";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";
import { invalidateKeyCache } from "@/lib/ai/runtime/key-cache";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const sb = createSupabaseServerServiceClient();
  const { data, error } = await sb
    .from("ai_provider_keys")
    .delete()
    .eq("id", id)
    .select("provider")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (data?.provider) invalidateKeyCache(data.provider as string);
  await sb.from("ai_provider_key_audit").insert({
    key_id: id,
    action: "deleted",
    actor_id: auth.userId,
    metadata: {},
  });
  return NextResponse.json({ ok: true });
}
