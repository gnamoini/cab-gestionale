import "server-only";

import type {
  AiProviderId,
  AiProviderKeyRow,
  DisabledReason,
  IngestMode,
  ManagedBy,
  RuntimeKeySource,
} from "@/lib/ai/runtime/types";
import { apiKeyFingerprint, canEncryptApiKeys, encryptApiKey } from "@/lib/ai/runtime/key-crypto";
import { inspectApiKeyFormat } from "@/lib/ai/runtime/key-validation";
import { testProviderKey } from "@/lib/ai/runtime/providers/registry";
import { invalidateKeyCache } from "@/lib/ai/runtime/key-cache";
import { createSupabaseServerServiceClient } from "@/src/lib/supabase/server-service-client";

export type IngestKeyInput = {
  provider: AiProviderId;
  slot: string;
  apiKey: string;
  priority?: number;
  weight?: number;
  source: RuntimeKeySource;
  managedBy: ManagedBy;
  mode: IngestMode;
  actorId?: string | null;
  envName?: string;
  dryRun?: boolean;
  requireProviderTest?: boolean;
};

export type IngestKeyResult =
  | { ok: true; id: string; mode: IngestMode; action: "created" | "updated" | "skipped" }
  | { ok: false; reason: string; warning?: boolean };

import { resolveIngestMode } from "@/lib/ai/runtime/ingest-mode";

export { resolveIngestMode };

async function audit(
  keyId: string | null,
  action: string,
  actorId: string | null | undefined,
  metadata: Record<string, unknown>,
): Promise<void> {
  const sb = createSupabaseServerServiceClient();
  await sb.from("ai_provider_key_audit").insert({
    key_id: keyId,
    action,
    actor_id: actorId ?? null,
    metadata,
  });
}

/** Shared ingest pipeline — UI, bootstrap sync, rotate. */
export async function ingestProviderKey(input: IngestKeyInput): Promise<IngestKeyResult> {
  const format = inspectApiKeyFormat(input.apiKey);
  if (!format.valid) {
    if (!input.dryRun) {
      await audit(null, "failed", input.actorId, {
        reason: "invalid_format",
        issues: format.issues,
        envName: input.envName,
      });
    }
    return { ok: false, reason: `Formato chiave non valido: ${format.issues.join(", ")}` };
  }

  if (!canEncryptApiKeys()) {
    return { ok: false, reason: "AI_MASTER_KEY_ENCRYPTION_KEY non configurata" };
  }

  const sb = createSupabaseServerServiceClient();
  const fingerprint = apiKeyFingerprint(input.apiKey);

  const { data: existingByFp } = await sb
    .from("ai_provider_keys")
    .select("*")
    .eq("key_fingerprint", fingerprint)
    .maybeSingle();

  const mode =
    input.mode === "NEW" || input.mode === "EXISTING" || input.mode === "RECOVERY"
      ? input.mode
      : resolveIngestMode(fingerprint, existingByFp as AiProviderKeyRow | undefined);

  const shouldTest =
    input.requireProviderTest !== false &&
    (mode === "NEW" || mode === "RECOVERY") &&
    (input.managedBy === "administrator" || mode === "NEW");

  if (shouldTest) {
    const test = await testProviderKey(input.provider, input.apiKey);
    if (!test.ok) {
      if (test.unreachable) {
        if (!input.dryRun) {
          await audit(existingByFp?.id ?? null, "sync_warning", input.actorId, {
            reason: "provider_unreachable",
            envName: input.envName,
            errorCode: test.errorCode,
          });
        }
        return {
          ok: false,
          reason: test.errorMessage ?? "Provider non raggiungibile",
          warning: true,
        };
      }
      if (!input.dryRun) {
        await audit(null, "failed", input.actorId, {
          reason: "provider_test_failed",
          errorCode: test.errorCode,
          envName: input.envName,
        });
      }
      return { ok: false, reason: test.errorMessage ?? "Test provider fallito" };
    }
  }

  if (input.dryRun) {
    return {
      ok: true,
      id: existingByFp?.id ?? "dry-run",
      mode,
      action: existingByFp ? "updated" : "created",
    };
  }

  const encrypted_key = encryptApiKey(input.apiKey);
  const row = {
    provider: input.provider,
    slot: input.slot,
    encrypted_key,
    key_fingerprint: fingerprint,
    priority: input.priority ?? 100,
    weight: input.weight ?? 100,
    enabled: true,
    status: "healthy",
    source: input.source,
    managed_by: input.managedBy,
    disabled_reason: null,
    updated_at: new Date().toISOString(),
  };

  if (existingByFp) {
    const { data, error } = await sb
      .from("ai_provider_keys")
      .update({
        ...row,
        cooldown_until: mode === "RECOVERY" ? null : existingByFp.cooldown_until,
      })
      .eq("id", existingByFp.id)
      .select("id")
      .single();
    if (error) return { ok: false, reason: error.message };
    invalidateKeyCache(input.provider);
    await audit(data.id, mode === "RECOVERY" ? "tested" : "sync_upsert", input.actorId, {
      mode,
      envName: input.envName,
      slot: input.slot,
    });
    return { ok: true, id: data.id as string, mode, action: "updated" };
  }

  const { data, error } = await sb
    .from("ai_provider_keys")
    .insert({
      ...row,
      created_by: input.actorId ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, reason: error.message };
  invalidateKeyCache(input.provider);
  await audit(data.id, "created", input.actorId, {
    mode,
    envName: input.envName,
    fingerprint,
    slot: input.slot,
  });
  return { ok: true, id: data.id as string, mode, action: "created" };
}

export async function disableProviderKey(input: {
  id: string;
  disabledReason: DisabledReason;
  actorId?: string | null;
  dryRun?: boolean;
}): Promise<void> {
  if (input.dryRun) return;
  const sb = createSupabaseServerServiceClient();
  const { data } = await sb.from("ai_provider_keys").select("provider").eq("id", input.id).maybeSingle();
  await sb
    .from("ai_provider_keys")
    .update({
      enabled: false,
      disabled_reason: input.disabledReason,
      status: "disabled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);
  if (data?.provider) invalidateKeyCache(data.provider as AiProviderId);
  await audit(input.id, "sync_disabled", input.actorId, { disabledReason: input.disabledReason });
}

export async function rotateProviderKey(input: {
  oldKeyId: string;
  provider: AiProviderId;
  newSlot: string;
  newApiKey: string;
  actorId?: string | null;
}): Promise<{ ok: true; newId: string } | { ok: false; reason: string }> {
  const created = await ingestProviderKey({
    provider: input.provider,
    slot: input.newSlot,
    apiKey: input.newApiKey,
    source: "admin_ui",
    managedBy: "administrator",
    mode: "NEW",
    actorId: input.actorId,
    requireProviderTest: true,
  });
  if (!created.ok) return { ok: false, reason: created.reason };

  const sb = createSupabaseServerServiceClient();
  const cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await sb
    .from("ai_provider_keys")
    .update({
      status: "cooldown",
      cooldown_until: cooldownUntil,
      rotation_replaced_by: created.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.oldKeyId);

  await audit(input.oldKeyId, "rotated", input.actorId, {
    replaced_by: created.id,
    cooldownUntil,
  });

  invalidateKeyCache(input.provider);
  return { ok: true, newId: created.id };
}
