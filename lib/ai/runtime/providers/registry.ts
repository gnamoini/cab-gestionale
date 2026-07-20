import "server-only";

import type { AiProviderId, ProviderTestResult } from "@/lib/ai/runtime/types";
import { classifyAiError } from "@/lib/ai/runtime/errors";
import { runGoogleProviderHealthCheck } from "@/lib/ai/runtime/providers/google";
import { isProviderImplemented } from "@/lib/ai/runtime/client-factory";

function isProviderUnreachable(code: string, message: string): boolean {
  const upper = message.toUpperCase();
  return (
    code === "AI_PROVIDER_DOWN" ||
    code === "AI_TIMEOUT" ||
    upper.includes("ECONNREFUSED") ||
    upper.includes("ENOTFOUND") ||
    upper.includes("FETCH FAILED") ||
    upper.includes("503") ||
    upper.includes("502")
  );
}

async function testGoogleProviderKey(apiKey: string): Promise<ProviderTestResult> {
  const t0 = performance.now();
  try {
    await runGoogleProviderHealthCheck(apiKey);
    return { ok: true, latencyMs: Math.round(performance.now() - t0) };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - t0);
    const code = classifyAiError(e);
    const errorMessage = e instanceof Error ? e.message : "Test fallito";
    return {
      ok: false,
      latencyMs,
      errorCode: code,
      errorMessage,
      unreachable: isProviderUnreachable(code, errorMessage),
    };
  }
}

/** Provider-agnostic live key test — SSOT for ingest + admin. */
export async function testProviderKey(provider: AiProviderId, apiKey: string): Promise<ProviderTestResult> {
  if (!isProviderImplemented(provider)) {
    return {
      ok: false,
      latencyMs: 0,
      errorCode: "AI_CONFIG_MISSING",
      errorMessage: `Provider non implementato: ${provider}`,
    };
  }
  if (provider === "google") return testGoogleProviderKey(apiKey);
  return {
    ok: false,
    latencyMs: 0,
    errorCode: "AI_CONFIG_MISSING",
    errorMessage: `Provider non implementato: ${provider}`,
  };
}
