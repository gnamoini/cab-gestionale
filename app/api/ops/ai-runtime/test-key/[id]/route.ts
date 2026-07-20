import { NextResponse } from "next/server";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";
import { decryptApiKey, canEncryptApiKeys } from "@/lib/ai/runtime/key-crypto";
import { MASTER_KEY_ENV_NAME, runtimeSecretPresence } from "@/lib/ai/runtime/env-reader";
import { testProviderKey } from "@/lib/ai/runtime/providers/registry";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";
import type { AiProviderId } from "@/lib/ai/runtime/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  if (!canEncryptApiKeys()) {
    const presence = runtimeSecretPresence(MASTER_KEY_ENV_NAME);
    const target = process.env.VERCEL_ENV?.trim() || "local";
    return NextResponse.json(
      {
        success: false,
        errorMessage:
          target === "production"
            ? "AI_MASTER_KEY_ENCRYPTION_KEY non configurata sul server. Impostarla su Vercel (Production) e ridistribuire."
            : `AI_MASTER_KEY_ENCRYPTION_KEY assente nel runtime (${target}). Verifica .env.local o Vercel env.`,
        diagnostic: {
          vercelEnv: process.env.VERCEL_ENV ?? null,
          deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
          masterKey: presence,
        },
      },
      { status: 503 },
    );
  }
  const sb = createSupabaseServerServiceClient();
  const { data, error } = await sb.from("ai_provider_keys").select("*").eq("id", id).maybeSingle();
  if (error || !data) {
    return NextResponse.json({ success: false, error: "Chiave non trovata" }, { status: 404 });
  }

  const apiKey = decryptApiKey(data.encrypted_key as string);
  const provider = data.provider as AiProviderId;
  const test = await testProviderKey(provider, apiKey);

  if (test.ok) {
    await sb.rpc("ai_provider_key_record_success", { p_key_id: id, p_latency_ms: test.latencyMs });
    await sb.from("ai_provider_key_audit").insert({
      key_id: id,
      action: "tested",
      actor_id: auth.userId,
      metadata: { success: true, latencyMs: test.latencyMs },
    });
    return NextResponse.json({ success: true, latencyMs: test.latencyMs });
  }

  if (test.errorCode) {
    await sb.rpc("ai_provider_key_record_failure", {
      p_key_id: id,
      p_error_code: test.errorCode,
      p_cooldown_seconds: null,
    });
  }
  return NextResponse.json(
    {
      success: false,
      latencyMs: test.latencyMs,
      errorType: test.errorCode,
      errorMessage: test.errorMessage ?? "Test fallito",
    },
    { status: 502 },
  );
}
