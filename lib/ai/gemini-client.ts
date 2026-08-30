import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import {
  resolveGeminiApiKeysFromEnv,
  resolvePrimaryGeminiEnvSource,

  inspectGeminiKeyFormat,
  readRuntimeEnvVar,
  normalizeGeminiReportModelId,
  runWithGeminiApiKeysFailover,
} from "@/lib/ai/gemini-api-keys";
import type { GeminiErrorType } from "@/lib/ai/gemini-error-types";
import { buildGeminiResolverDiagnostics } from "@/lib/ai/gemini-env-diagnostics";
import { logGeminiConfigurationCheck } from "@/lib/ai/gemini-observability.server";

export {
  geminiKeySlotForIndex,
  getGeminiConfigurationStatus,
  isGeminiApiKeyFormatValid,
  isGeminiAuthError,
  isGeminiFailoverError,
  isGeminiModelUnavailableError,
  isGeminiQuotaError,
  isGeminiUnreachableError,
  normalizeGeminiReportModelId,
  resolveGeminiApiKeysFromEnv,
  runWithGeminiApiKeysFailover,
} from "@/lib/ai/gemini-api-keys";

/**
 * AI-SSOT-1: unica fonte di verità Gemini.
 * API key, modello, client, auth handling, timeout constants, messaggi comuni.
 * Nessuna feature deve leggere process.env.GEMINI_* direttamente.
 */

/** Modello default — sostituto stabile di gemini-2.5-flash (non disponibile su chiavi nuove). */
export const GEMINI_REPORT_MODEL_ID = "gemini-3.5-flash";

export function resolveGeminiReportModelId(): string {
  const normalized = normalizeGeminiReportModelId(
    process.env.GEMINI_MODEL_ID,
    GEMINI_REPORT_MODEL_ID,
  );
  const fromEnv = process.env.GEMINI_MODEL_ID?.trim();
  if (fromEnv && fromEnv !== normalized) {
    console.warn(
      `[gemini-client] deprecated GEMINI_MODEL_ID=${fromEnv} → using ${normalized}`,
    );
  }
  return normalized;
}

/** Timeout default analisi testo (Report AI). Override: REPORT_ANALYSIS_LLM_TIMEOUT_MS. */
export const GEMINI_REPORT_ANALYSIS_TIMEOUT_MS_DEFAULT = 45_000;

/** Timeout analisi file (PDF/immagini) — document capture, import listino/ordini. */
export const GEMINI_FILE_ANALYSIS_TIMEOUT_MS = 90_000;

export const GEMINI_NOT_CONFIGURED_MESSAGE =
  "Servizio Analisi AI non configurato. Imposta GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY o GOOGLE_API_KEY.";

export const GEMINI_AUTH_ERROR_HINT =
  "Chiave Gemini non valida. Genera una nuova chiave su Google AI Studio (formato AIza...) e impostala in GOOGLE_GENERATIVE_AI_API_KEY o GEMINI_API_KEY.";

export function listGeminiApiKeys(): string[] {
  return resolveGeminiApiKeysFromEnv();
}

/** Risolve la API key primaria. */
export function getGeminiApiKey(): string | null {
  return listGeminiApiKeys()[0] ?? null;
}

export function isGeminiConfigured(): boolean {
  const keys = listGeminiApiKeys();
  if (keys.length > 0) return true;
  const resolver = buildGeminiResolverDiagnostics();
  const primarySource = resolvePrimaryGeminiEnvSource();
  const keyLength = primarySource ? (resolver.directPresence[primarySource]?.length ?? 0) : 0;
  logGeminiConfigurationCheck({
    configured: false,
    primarySource,
    keyLength,
    formatValid: false,
    resolverMismatch: resolver.mismatchEntriesVsDirect,
  });
  return false;
}

export type GeminiConfigurationGateFailure = {
  code: "not_configured";
  errorType: GeminiErrorType;
  message: string;
};

export function resolveGeminiConfigurationGate(): GeminiConfigurationGateFailure | null {
  const keys = listGeminiApiKeys();
  if (keys.length > 0) {
    const primary = keys[0]!;
    const inspection = inspectGeminiKeyFormat(primary);
    if (!inspection.valid) {
      return {
        code: "not_configured",
        errorType: "CONFIG_INVALID_FORMAT",
        message: GEMINI_AUTH_ERROR_HINT,
      };
    }
    return null;
  }
  const primarySource = resolvePrimaryGeminiEnvSource();
  if (primarySource) {
    const raw = Reflect.get(process.env, primarySource) as string | undefined;
    if (raw != null && raw !== "" && readRuntimeEnvVar(primarySource) === "") {
      return {
        code: "not_configured",
        errorType: "CONFIG_EMPTY",
        message: GEMINI_NOT_CONFIGURED_MESSAGE,
      };
    }
    const inspection = inspectGeminiKeyFormat(raw ?? null);
    if (raw && !inspection.valid) {
      return {
        code: "not_configured",
        errorType: "CONFIG_INVALID_FORMAT",
        message: GEMINI_AUTH_ERROR_HINT,
      };
    }
  }
  return {
    code: "not_configured",
    errorType: "CONFIG_NOT_FOUND",
    message: GEMINI_NOT_CONFIGURED_MESSAGE,
  };
}

export type GeminiKeySlot = "primary" | "secondary";

export function resolveGeminiReportAnalysisTimeoutMs(): number {
  const raw = process.env.REPORT_ANALYSIS_LLM_TIMEOUT_MS?.trim();
  if (!raw) return GEMINI_REPORT_ANALYSIS_TIMEOUT_MS_DEFAULT;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : GEMINI_REPORT_ANALYSIS_TIMEOUT_MS_DEFAULT;
}

export const GEMINI_QUOTA_ERROR_HINT =
  "Limite richieste o quota Gemini raggiunta. Attendi qualche minuto, riduci le pagine del PDF o usa Excel/CSV.";

export function getGeminiReportModelForApiKey(apiKey: string, modelId?: string): LanguageModel {
  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelId ?? resolveGeminiReportModelId());
}

/** Modello Gemini — null se API key assente. */
export function getGeminiReportModel(): LanguageModel | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return getGeminiReportModelForApiKey(apiKey);
}

/** Modello Gemini — throw se API key assente (per generateObject / generateText). */
export function requireGeminiReportModel(): LanguageModel {
  const model = getGeminiReportModel();
  if (!model) throw new Error(GEMINI_NOT_CONFIGURED_MESSAGE);
  return model;
}

export async function runWithGeminiFailover<T>(
  fn: (
    model: LanguageModel,
    meta: { keyIndex: number; keySlot: GeminiKeySlot },
  ) => Promise<T>,
): Promise<T> {
  return runWithGeminiApiKeysFailover(
    listGeminiApiKeys(),
    async (apiKey, meta) => fn(getGeminiReportModelForApiKey(apiKey), meta),
    { notConfiguredMessage: GEMINI_NOT_CONFIGURED_MESSAGE },
  );
}
