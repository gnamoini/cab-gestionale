import "server-only";

import { generateObject, generateText, type LanguageModel } from "ai";
import type { AiGenerateObjectMessages, AiGenerateObjectSchema } from "@/lib/ai/runtime/generate-object-types";
import {
  AiRuntimeError,
  aiErrorMessage,
  classifyAiError,
  isFailoverEligible,
} from "@/lib/ai/runtime/errors";
import {
  loadActiveKeys,
  recordKeyFailure,
  recordKeySuccess,
} from "@/lib/ai/runtime/config-store";
import { isBootstrapFallbackEnabled } from "@/lib/ai/runtime/env-reader";
import { createLanguageModel } from "@/lib/ai/runtime/client-factory";
import { resolveGoogleHealthCheckModelId } from "@/lib/ai/runtime/google-health-check-config";
import { testProviderKey } from "@/lib/ai/runtime/providers/registry";
import { syncRuntimeConfigToDatabase } from "@/lib/ai/runtime/sync-runtime-config";
import {
  cooldownSecondsForError,
  mapErrorToKeyStatus,
  orderKeysForFailover,
  selectBestKey,
} from "@/lib/ai/runtime/key-manager";
import {
  readRuntimeProviderDefault,
  readRuntimeModelForProvider,
  readRuntimeTimeoutMs,
} from "@/lib/ai/runtime/env-reader";
import { logAiObs } from "@/lib/ai/runtime/observability";
import type {
  AiCallMeta,
  AiConfigurationStatus,
  AiErrorCode,
  AiProviderId,
  AiServiceResult,
  ResolvedAiKey,
} from "@/lib/ai/runtime/types";

let fallbackSyncAttempted = false;

/** ponytail: cold-start only — cron is primary sync path. */
async function ensureFallbackSyncIfEmpty(provider: AiProviderId): Promise<void> {
  if (fallbackSyncAttempted || !isBootstrapFallbackEnabled()) return;
  const peek = await loadActiveKeys(provider, { skipCache: true });
  if (peek.keys.length > 0) return;
  fallbackSyncAttempted = true;
  try {
    const result = await syncRuntimeConfigToDatabase();
    if (result.created + result.updated > 0) {
      logAiObs("AI_CONFIG_CHECK", {
        fallbackSyncCreated: result.created,
        fallbackSyncUpdated: result.updated,
      });
    }
  } catch (e) {
    console.warn("[ai-runtime] fallback bootstrap sync failed", e);
  }
}

async function resolveKeys(provider: AiProviderId): Promise<{
  keys: ResolvedAiKey[];
  degradedMode: boolean;
}> {
  await ensureFallbackSyncIfEmpty(provider);
  const loaded = await loadActiveKeys(provider);
  return { keys: loaded.keys, degradedMode: loaded.degradedMode };
}

async function runWithFailover<T>(input: {
  provider?: AiProviderId;
  operation: string;
  fn: (model: LanguageModel, key: ResolvedAiKey) => Promise<T>;
}): Promise<{ result: T; meta: AiCallMeta }> {
  const provider = (input.provider ?? readRuntimeProviderDefault()) as AiProviderId;
  const modelId = readRuntimeModelForProvider(provider);
  const { keys, degradedMode } = await resolveKeys(provider);
  const first = selectBestKey(keys);
  if (!first) {
    throw new AiRuntimeError("AI_CONFIG_MISSING", aiErrorMessage("AI_CONFIG_MISSING"));
  }

  const ordered = orderKeysForFailover(keys, first);
  let failoverCount = 0;
  let lastCode: AiErrorCode = "AI_UNKNOWN_ERROR";
  let lastMessage = aiErrorMessage("AI_UNKNOWN_ERROR");

  for (const key of ordered) {
    const t0 = performance.now();
    logAiObs("AI_REQUEST", {
      operation: input.operation,
      provider,
      modelId,
      keyId: key.id,
      keySlot: key.slot,
      keySource: key.source,
      degradedMode,
    });
    try {
      const model = createLanguageModel(provider, key.apiKey, modelId);
      const result = await input.fn(model, key);
      const durationMs = Math.round(performance.now() - t0);
      await recordKeySuccess(key, durationMs).catch(() => undefined);
      logAiObs("AI_RESPONSE", {
        operation: input.operation,
        provider,
        modelId,
        keyId: key.id,
        durationMs,
        failoverCount,
      });
      return {
        result,
        meta: {
          provider,
          modelId,
          keyId: key.id,
          keySlot: key.slot,
          keySource: key.source,
          durationMs,
          failoverCount,
          operation: input.operation,
        },
      };
    } catch (error) {
      const durationMs = Math.round(performance.now() - t0);
      const code = classifyAiError(error);
      lastCode = code;
      lastMessage = error instanceof Error ? error.message : aiErrorMessage(code);
      const status = mapErrorToKeyStatus(code);
      await recordKeyFailure(key, code, {
        cooldownSeconds: status === "cooldown" ? cooldownSecondsForError(code) : undefined,
      }).catch(() => undefined);
      logAiObs("AI_FAILURE", {
        operation: input.operation,
        provider,
        modelId,
        keyId: key.id,
        durationMs,
        errorCode: code,
        failoverCount,
      });
      const hasNext = ordered.indexOf(key) < ordered.length - 1;
      if (!hasNext || !isFailoverEligible(code)) {
        throw new AiRuntimeError(code, lastMessage);
      }
      failoverCount += 1;
      logAiObs("AI_FAILOVER", { fromKeyId: key.id, failoverCount, errorCode: code });
    }
  }

  throw new AiRuntimeError(lastCode, lastMessage);
}

async function getConfigurationStatus(): Promise<AiConfigurationStatus> {
  const provider = readRuntimeProviderDefault() as AiProviderId;
  await ensureFallbackSyncIfEmpty(provider);
  const loaded = await loadActiveKeys(provider);
  return {
    configured: loaded.keys.length > 0,
    provider,
    modelId: readRuntimeModelForProvider(provider),
    activeKeyCount: loaded.keys.length,
    primarySource: loaded.source === "none" ? null : loaded.source,
    degradedMode: loaded.degradedMode,
  };
}

export const aiService = {
  async getConfigurationStatus(): Promise<AiConfigurationStatus> {
    return getConfigurationStatus();
  },

  async assertConfigured(): Promise<void> {
    const status = await getConfigurationStatus();
    if (!status.configured) {
      throw new AiRuntimeError("AI_CONFIG_MISSING", aiErrorMessage("AI_CONFIG_MISSING"));
    }
  },

  async runHealthCheck(): Promise<AiServiceResult<{ latencyMs: number }>> {
    const provider = readRuntimeProviderDefault() as AiProviderId;
    const { keys } = await resolveKeys(provider);
    const first = selectBestKey(keys);
    if (!first) {
      return { ok: false, code: "AI_CONFIG_MISSING", message: aiErrorMessage("AI_CONFIG_MISSING") };
    }

    const ordered = orderKeysForFailover(keys, first);
    let failoverCount = 0;
    let lastCode: AiErrorCode = "AI_UNKNOWN_ERROR";
    let lastMessage = aiErrorMessage("AI_UNKNOWN_ERROR");

    for (const key of ordered) {
      logAiObs("AI_REQUEST", {
        operation: "ops_health_check",
        provider: key.provider,
        modelId: resolveGoogleHealthCheckModelId(),
        keyId: key.id,
        keySlot: key.slot,
        keySource: key.source,
      });
      const test = await testProviderKey(key.provider, key.apiKey);
      if (test.ok) {
        await recordKeySuccess(key, test.latencyMs).catch(() => undefined);
        logAiObs("AI_RESPONSE", {
          operation: "ops_health_check",
          provider: key.provider,
          modelId: resolveGoogleHealthCheckModelId(),
          keyId: key.id,
          durationMs: test.latencyMs,
          failoverCount,
        });
        return {
          ok: true,
          data: { latencyMs: test.latencyMs },
          meta: {
            provider: key.provider,
            modelId: resolveGoogleHealthCheckModelId(),
            keyId: key.id,
            keySlot: key.slot,
            keySource: key.source,
            durationMs: test.latencyMs,
            failoverCount,
            operation: "ops_health_check",
          },
        };
      }

      lastCode = (test.errorCode as AiErrorCode | undefined) ?? "AI_UNKNOWN_ERROR";
      lastMessage = test.errorMessage ?? aiErrorMessage(lastCode);
      if (test.errorCode && isFailoverEligible(lastCode)) {
        await recordKeyFailure(key, test.errorCode, {
          cooldownSeconds: cooldownSecondsForError(test.errorCode),
        }).catch(() => undefined);
        failoverCount += 1;
        continue;
      }
      break;
    }

    return { ok: false, code: lastCode, message: lastMessage };
  },

  async generateText(input: {
    prompt: string;
    operation?: string;
    provider?: AiProviderId;
    timeoutMs?: number;
  }): Promise<AiServiceResult<{ text: string }>> {
    try {
      const { result, meta } = await runWithFailover({
        provider: input.provider,
        operation: input.operation ?? "generate_text",
        fn: async (model) => {
          const out = await generateText({
            model,
            prompt: input.prompt,
            abortSignal: AbortSignal.timeout(input.timeoutMs ?? readRuntimeTimeoutMs()),
          });
          return { text: out.text };
        },
      });
      return { ok: true, data: result, meta };
    } catch (error) {
      const code = error instanceof AiRuntimeError ? error.code : classifyAiError(error);
      return {
        ok: false,
        code,
        message: error instanceof Error ? error.message : aiErrorMessage(code),
      };
    }
  },

  async generateObject<T>(input: {
    schema: AiGenerateObjectSchema;
    system?: string;
    messages?: AiGenerateObjectMessages;
    prompt?: string;
    temperature?: number;
    operation?: string;
    provider?: AiProviderId;
    timeoutMs?: number;
  }): Promise<AiServiceResult<{ object: T; usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }; response?: unknown }>> {
    try {
      const { result, meta } = await runWithFailover({
        provider: input.provider,
        operation: input.operation ?? "generate_object",
        fn: async (model) => {
          const base = {
            model,
            schema: input.schema,
            system: input.system,
            temperature: input.temperature,
            abortSignal: AbortSignal.timeout(input.timeoutMs ?? readRuntimeTimeoutMs()),
          };
          const out = input.messages
            ? await generateObject({ ...base, messages: input.messages })
            : await generateObject({ ...base, prompt: input.prompt ?? "" });
          return {
            object: out.object as T,
            usage: out.usage,
            response: out.response,
          };
        },
      });
      return { ok: true, data: result, meta };
    } catch (error) {
      const code = error instanceof AiRuntimeError ? error.code : classifyAiError(error);
      return {
        ok: false,
        code,
        message: error instanceof Error ? error.message : aiErrorMessage(code),
      };
    }
  },

  async analyzeDocument<T>(input: {
    schema: AiGenerateObjectSchema;
    system: string;
    userContent: AiGenerateObjectMessages;
    temperature?: number;
    timeoutMs?: number;
  }): Promise<AiServiceResult<{ object: T; usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }; response?: unknown }>> {
    return aiService.generateObject<T>({
      schema: input.schema,
      system: input.system,
      messages: input.userContent,
      temperature: input.temperature ?? 0.2,
      timeoutMs: input.timeoutMs,
      operation: "analyze_document",
    });
  },

  async extractData<T>(input: {
    schema: AiGenerateObjectSchema;
    system: string;
    messages?: AiGenerateObjectMessages;
    prompt?: string;
    operation?: string;
    timeoutMs?: number;
  }): Promise<AiServiceResult<{ object: T; usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } }>> {
    const result = await aiService.generateObject<T>({
      schema: input.schema,
      system: input.system,
      messages: input.messages,
      prompt: input.prompt,
      operation: input.operation ?? "extract_data",
      timeoutMs: input.timeoutMs,
    });
    if (!result.ok) return result;
    return {
      ok: true,
      data: { object: result.data.object, usage: result.data.usage },
      meta: result.meta,
    };
  },
};

export type { AiServiceResult, AiConfigurationStatus, AiErrorCode };
