import "server-only";

import { buildAiRuntimeDebugPayload } from "@/lib/ops/ai-runtime-debug.server";
import { aiService } from "@/lib/ai/runtime/service";
import { listProviderKeysMasked } from "@/lib/ai/runtime/config-store";
import { readRuntimeProviderDefault } from "@/lib/ai/runtime/env-reader";

export async function buildAiRuntimeInfoPayload() {
  const status = await aiService.getConfigurationStatus();
  const debug = buildAiRuntimeDebugPayload();
  return {
    ...debug,
    configuration: status,
    defaultProvider: readRuntimeProviderDefault(),
  };
}

export async function buildAiRuntimeKeysPayload() {
  const keys = await listProviderKeysMasked();
  return {
    keys: keys.map((k) => ({
      id: k.id,
      provider: k.provider,
      slot: k.slot,
      fingerprint: k.key_fingerprint,
      enabled: k.enabled,
      priority: k.priority,
      weight: k.weight,
      status: k.status,
      cooldownUntil: k.cooldown_until,
      requestsTotal: k.requests_total,
      successTotal: k.success_total,
      failureTotal: k.failure_total,
      rateLimitTotal: k.rate_limit_total,
      latencyMsAvg:
        k.latency_ms_count > 0 ? Math.round(k.latency_ms_sum / k.latency_ms_count) : null,
      lastUsedAt: k.last_used_at,
      lastSuccessAt: k.last_success_at,
      lastFailureAt: k.last_failure_at,
      lastError: k.last_error,
    })),
  };
}
