import { NextResponse } from "next/server";
import { ingestProviderKey } from "@/lib/ai/runtime/key-ingest";
import { listProviderKeysMasked } from "@/lib/ai/runtime/config-store";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";
import type { AiProviderId } from "@/lib/ai/runtime/types";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import { invalidateKeyCache } from "@/lib/ai/runtime/key-cache";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const keys = await listProviderKeysMasked();
    return NextResponse.json({ keys });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore", keys: [] },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json()) as {
    provider?: AiProviderId;
    slot?: string;
    apiKey?: string;
    priority?: number;
    weight?: number;
  };

  if (!body.provider || !body.slot?.trim() || !body.apiKey?.trim()) {
    return NextResponse.json({ error: "provider, slot e apiKey obbligatori" }, { status: 400 });
  }

  const result = await ingestProviderKey({
    provider: body.provider,
    slot: body.slot.trim(),
    apiKey: body.apiKey.trim(),
    priority: body.priority,
    weight: body.weight,
    source: "admin_ui",
    managedBy: "administrator",
    mode: "NEW",
    actorId: auth.userId,
    requireProviderTest: true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.id });
}

export async function PATCH(request: Request) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json()) as {
    id?: string;
    enabled?: boolean;
    priority?: number;
    weight?: number;
    status?: string;
    disabledReason?: string;
  };
  if (!body.id) return NextResponse.json({ error: "id obbligatorio" }, { status: 400 });

  const sb = createSupabaseServerServiceClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.enabled === "boolean") {
    patch.enabled = body.enabled;
    if (!body.enabled) {
      patch.disabled_reason = body.disabledReason ?? "manual_admin";
      patch.status = "disabled";
    } else {
      patch.disabled_reason = null;
      patch.status = "healthy";
    }
  }
  if (typeof body.priority === "number") patch.priority = body.priority;
  if (typeof body.weight === "number") patch.weight = body.weight;
  if (body.status) patch.status = body.status;

  const { data, error } = await sb
    .from("ai_provider_keys")
    .update(patch)
    .eq("id", body.id)
    .select("id, provider")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Aggiornamento fallito" }, { status: 400 });
  }
  invalidateKeyCache(data.provider as string);
  await sb.from("ai_provider_key_audit").insert({
    key_id: body.id,
    action: "updated",
    actor_id: auth.userId,
    metadata: patch,
  });
  return NextResponse.json({ ok: true });
}
