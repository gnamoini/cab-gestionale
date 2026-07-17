import { NextResponse } from "next/server";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import { decryptApiKey } from "@/lib/ai/runtime/key-crypto";
import { createLanguageModel } from "@/lib/ai/runtime/client-factory";
import { generateText } from "ai";
import { classifyAiError } from "@/lib/ai/runtime/errors";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";
import type { AiProviderId } from "@/lib/ai/runtime/types";

export const runtime = "nodejs";
export const maxDuration = 15;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  const sb = createSupabaseServerServiceClient();
  const { data, error } = await sb.from("ai_provider_keys").select("*").eq("id", id).maybeSingle();
  if (error || !data) {
    return NextResponse.json({ success: false, error: "Chiave non trovata" }, { status: 404 });
  }

  const t0 = performance.now();
  try {
    const apiKey = decryptApiKey(data.encrypted_key as string);
    const provider = data.provider as AiProviderId;
    const model = createLanguageModel(provider, apiKey);
    await generateText({ model, prompt: "ok", abortSignal: AbortSignal.timeout(10_000) });
    const latencyMs = Math.round(performance.now() - t0);
    await sb.rpc("ai_provider_key_record_success", { p_key_id: id, p_latency_ms: latencyMs });
    await sb.from("ai_provider_key_audit").insert({
      key_id: id,
      action: "tested",
      actor_id: auth.userId,
      metadata: { success: true, latencyMs },
    });
    return NextResponse.json({ success: true, latencyMs });
  } catch (e) {
    const latencyMs = Math.round(performance.now() - t0);
    const code = classifyAiError(e);
    await sb.rpc("ai_provider_key_record_failure", {
      p_key_id: id,
      p_error_code: code,
      p_cooldown_seconds: null,
    });
    return NextResponse.json(
      { success: false, latencyMs, errorType: code, errorMessage: e instanceof Error ? e.message : "Test fallito" },
      { status: 502 },
    );
  }
}
