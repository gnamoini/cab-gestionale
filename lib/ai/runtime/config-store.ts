import "server-only";

import type { AiKeyStatus, AiProviderId, AiProviderKeyRow, ResolvedAiKey } from "@/lib/ai/runtime/types";
import { apiKeyFingerprint, canEncryptApiKeys, decryptApiKey, encryptApiKey } from "@/lib/ai/runtime/key-crypto";
import { readLegacyGoogleKeys } from "@/lib/ai/runtime/env-reader";
import { getCachedKeys, invalidateKeyCache, setCachedKeys } from "@/lib/ai/runtime/key-cache";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";

function parseStatus(raw: string): AiKeyStatus {
  if (
    raw === "healthy" ||
    raw === "degraded" ||
    raw === "rate_limited" ||
    raw === "cooldown" ||
    raw === "invalid" ||
    raw === "disabled"
  ) {
    return raw;
  }
  return "healthy";
}

function rowToResolved(row: AiProviderKeyRow, apiKey: string): ResolvedAiKey {
  const latencyMsAvg =
    row.latency_ms_count > 0 ? Math.round(row.latency_ms_sum / row.latency_ms_count) : null;
  return {
    id: row.id,
    provider: row.provider as AiProviderId,
    slot: row.slot,
    apiKey,
    priority: row.priority,
    weight: row.weight,
    status: parseStatus(row.status),
    cooldownUntil: row.cooldown_until ? new Date(row.cooldown_until) : null,
    fingerprint: row.key_fingerprint,
    source: "database",
    requestsTotal: row.requests_total,
    successTotal: row.success_total,
    failureTotal: row.failure_total,
    rateLimitTotal: row.rate_limit_total,
    latencyMsAvg,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : null,
  };
}

function legacyToResolved(entry: { envName: string; apiKey: string; slot: string }, index: number): ResolvedAiKey {
  return {
    id: `legacy:${entry.envName}`,
    provider: "google",
    slot: entry.slot,
    apiKey: entry.apiKey,
    priority: 1000 + index,
    weight: 100,
    status: "healthy",
    cooldownUntil: null,
    fingerprint: apiKeyFingerprint(entry.apiKey),
    source: "legacy_env",
    requestsTotal: 0,
    successTotal: 0,
    failureTotal: 0,
    rateLimitTotal: 0,
    latencyMsAvg: null,
    lastUsedAt: null,
  };
}

async function loadKeysFromDatabase(provider: AiProviderId): Promise<ResolvedAiKey[]> {
  const sb = createSupabaseServerServiceClient();
  const { data, error } = await sb
    .from("ai_provider_keys")
    .select("*")
    .eq("provider", provider)
    .eq("enabled", true)
    .order("priority", { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as AiProviderKeyRow[];
  const resolved: ResolvedAiKey[] = [];
  for (const row of rows) {
    try {
      const apiKey = decryptApiKey(row.encrypted_key);
      resolved.push(rowToResolved(row, apiKey));
    } catch {
      // skip undecryptable rows
    }
  }
  return resolved;
}

export async function loadActiveKeys(provider: AiProviderId, options?: { skipCache?: boolean }): Promise<{
  keys: ResolvedAiKey[];
  source: "database" | "legacy_env" | "none";
  degradedMode: boolean;
}> {
  if (!options?.skipCache) {
    const cached = getCachedKeys(provider);
    if (cached) {
      return {
        keys: cached,
        source: cached[0]?.source ?? "none",
        degradedMode: cached.some((k) => k.source === "legacy_env"),
      };
    }
  }

  let degradedMode = false;
  try {
    const dbKeys = await loadKeysFromDatabase(provider);
    if (dbKeys.length > 0) {
      setCachedKeys(provider, dbKeys);
      return { keys: dbKeys, source: "database", degradedMode: false };
    }
  } catch (e) {
    console.warn("[ai-runtime] DB key load failed, falling back to legacy env", e);
    degradedMode = true;
  }

  if (provider === "google") {
    const legacy = readLegacyGoogleKeys().map(legacyToResolved);
    if (legacy.length > 0) {
      setCachedKeys(provider, legacy);
      return { keys: legacy, source: "legacy_env", degradedMode: true };
    }
  }

  return { keys: [], source: "none", degradedMode };
}

export async function recordKeySuccess(key: ResolvedAiKey, latencyMs: number): Promise<void> {
  if (key.source !== "database") return;
  const sb = createSupabaseServerServiceClient();
  await sb.rpc("ai_provider_key_record_success", { p_key_id: key.id, p_latency_ms: latencyMs });
  invalidateKeyCache(key.provider);
}

export async function recordKeyFailure(
  key: ResolvedAiKey,
  errorCode: string,
  options?: { cooldownSeconds?: number },
): Promise<void> {
  if (key.source !== "database") return;
  const sb = createSupabaseServerServiceClient();
  await sb.rpc("ai_provider_key_record_failure", {
    p_key_id: key.id,
    p_error_code: errorCode,
    p_cooldown_seconds: options?.cooldownSeconds ?? null,
  });
  invalidateKeyCache(key.provider);
}

export async function insertProviderKey(input: {
  provider: AiProviderId;
  slot: string;
  apiKey: string;
  priority?: number;
  weight?: number;
  createdBy?: string | null;
}): Promise<{ id: string }> {
  if (!canEncryptApiKeys()) {
    throw new Error("AI_MASTER_KEY_ENCRYPTION_KEY non configurata");
  }
  const sb = createSupabaseServerServiceClient();
  const encrypted_key = encryptApiKey(input.apiKey);
  const key_fingerprint = apiKeyFingerprint(input.apiKey);
  const { data, error } = await sb
    .from("ai_provider_keys")
    .insert({
      provider: input.provider,
      slot: input.slot,
      encrypted_key,
      key_fingerprint,
      priority: input.priority ?? 100,
      weight: input.weight ?? 100,
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  invalidateKeyCache(input.provider);
  await sb.from("ai_provider_key_audit").insert({
    key_id: data.id,
    action: "created",
    actor_id: input.createdBy ?? null,
    metadata: { provider: input.provider, slot: input.slot, fingerprint: key_fingerprint },
  });
  return { id: data.id as string };
}

export async function listProviderKeysMasked(provider?: AiProviderId): Promise<
  Omit<AiProviderKeyRow, "encrypted_key">[]
> {
  const sb = createSupabaseServerServiceClient();
  let q = sb
    .from("ai_provider_keys")
    .select(
      "id, provider, slot, key_fingerprint, enabled, priority, weight, status, cooldown_until, requests_total, success_total, failure_total, rate_limit_total, latency_ms_sum, latency_ms_count, last_used_at, last_success_at, last_failure_at, last_error, source, managed_by, disabled_reason, rotation_replaced_by",
    )
    .order("priority", { ascending: true });
  if (provider) q = q.eq("provider", provider);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Omit<AiProviderKeyRow, "encrypted_key">[];
}
