import type { AiErrorCode } from "@/lib/ai/runtime/types";

export class AiRuntimeError extends Error {
  readonly code: AiErrorCode;
  readonly retryAfterSec?: number;

  constructor(code: AiErrorCode, message: string, options?: { retryAfterSec?: number }) {
    super(message);
    this.name = "AiRuntimeError";
    this.code = code;
    this.retryAfterSec = options?.retryAfterSec;
  }
}

const MESSAGES: Record<AiErrorCode, string> = {
  AI_CONFIG_MISSING:
    "Servizio AI non configurato. Aggiungi una chiave in Impostazioni → AI Providers o contatta l'amministratore.",
  AI_KEY_INVALID: "Chiave API rifiutata dal provider. Verifica o ruota la chiave in Impostazioni → AI Providers.",
  AI_RATE_LIMIT: "Limite richieste raggiunto. Attendi qualche minuto e riprova.",
  AI_QUOTA_EXCEEDED:
    "Quota API Gemini esaurita (piano free: limite basso su PDF multipagina). Attendi 1–2 minuti e riprova, verifica utilizzo su aistudio.google.com/usage, oppure importa il listino via Excel in Magazzino.",
  AI_PROVIDER_DOWN: "Provider AI temporaneamente non raggiungibile. Riprova tra poco.",
  AI_TIMEOUT: "Timeout durante l'analisi AI. Riduci il documento o riprova.",
  AI_SCHEMA_VALIDATION: "Risposta AI non conforme allo schema atteso. Riprova con un documento più nitido.",
  AI_STORAGE_ERROR: "Accesso al file in storage non riuscito durante l'analisi.",
  AI_DATABASE_ERROR: "Salvataggio dati analisi non riuscito.",
  AI_MODEL_UNAVAILABLE: "Modello Gemini non disponibile per questa chiave API.",
  AI_PAYLOAD_TOO_LARGE: "Documento troppo grande per l'analisi AI.",
  AI_UNKNOWN_ERROR: "Errore imprevisto durante l'elaborazione AI.",
};

export function aiErrorMessage(code: AiErrorCode): string {
  return MESSAGES[code];
}

function readErrorText(error: unknown): { text: string; upper: string; name: string; status?: number } {
  const text =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error);
  const upper = text.toUpperCase();
  const name =
    error instanceof Error
      ? error.name
      : error && typeof error === "object" && "name" in error
        ? String((error as { name?: unknown }).name ?? "")
        : "";
  const status =
    error && typeof error === "object" && "status" in error && typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : error && typeof error === "object" && "statusCode" in error && typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : undefined;
  return { text, upper, name, status };
}

function classifyHttpStatus(status: number | undefined): AiErrorCode | null {
  if (status == null) return null;
  if (status === 401 || status === 403) return "AI_KEY_INVALID";
  if (status === 429) return "AI_QUOTA_EXCEEDED";
  if (status === 404) return "AI_MODEL_UNAVAILABLE";
  if (status === 413) return "AI_PAYLOAD_TOO_LARGE";
  if (status >= 500) return "AI_PROVIDER_DOWN";
  return null;
}

function isPostgrestError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && "message" in error && "details" in error);
}

function extractRetryLastErrorMessage(text: string): string | null {
  const match = text.match(/Last error:\s*([\s\S]+)$/i);
  return match?.[1]?.trim() || null;
}

function classifyProviderPressureMessage(upper: string): AiErrorCode | null {
  if (
    upper.includes("HIGH DEMAND") ||
    upper.includes("TRY AGAIN LATER") ||
    upper.includes("OVERLOADED") ||
    upper.includes("TEMPORARILY UNAVAILABLE") ||
    upper.includes("SERVICE UNAVAILABLE")
  ) {
    return "AI_PROVIDER_DOWN";
  }
  return null;
}

export function classifyAiError(error: unknown): AiErrorCode {
  if (error instanceof AiRuntimeError) return error.code;

  const { text, upper, name, status } = readErrorText(error);
  const fromStatus = classifyHttpStatus(status);
  if (fromStatus) return fromStatus;

  if (
    name === "AbortError" ||
    name === "TimeoutError" ||
    upper.includes("TIMEOUT") ||
    upper.includes("ABORT") ||
    upper.includes("FUNCTION_INVOCATION_TIMEOUT") ||
    upper.includes("GATEWAY TIMEOUT") ||
    upper.includes("BUDGET ESAURITO")
  ) {
    return "AI_TIMEOUT";
  }

  if (
    name === "NoObjectGeneratedError" ||
    name === "AI_NoObjectGeneratedError" ||
    name === "AI_TypeValidationError" ||
    name === "TypeValidationError" ||
    upper.includes("NO OBJECT GENERATED") ||
    upper.includes("TYPE VALIDATION") ||
    upper.includes("FAILED TO PARSE") ||
    (upper.includes("JSON") && upper.includes("SCHEMA"))
  ) {
    return "AI_SCHEMA_VALIDATION";
  }

  if (
    name === "AI_NoSuchModelError" ||
    name === "NoSuchModelError" ||
    upper.includes("NO SUCH LANGUAGEMODEL")
  ) {
    return "AI_MODEL_UNAVAILABLE";
  }

  if (name === "AI_LoadAPIKeyError" || name === "LoadAPIKeyError") {
    return "AI_KEY_INVALID";
  }

  if (
    name === "AI_InvalidPromptError" ||
    name === "InvalidPromptError" ||
    name === "AI_InvalidDataContentError" ||
    name === "InvalidDataContentError"
  ) {
    return "AI_SCHEMA_VALIDATION";
  }

  if (name === "AI_JSONParseError" || name === "JSONParseError") {
    return "AI_SCHEMA_VALIDATION";
  }

  if (
    name === "AI_RetryError" ||
    name === "RetryError" ||
    (upper.includes("FAILED AFTER") && upper.includes("LAST ERROR"))
  ) {
    const last = extractRetryLastErrorMessage(text);
    if (last) {
      const nested = classifyAiError(new Error(last));
      if (nested !== "AI_UNKNOWN_ERROR") return nested;
      const nestedPressure = classifyProviderPressureMessage(last.toUpperCase());
      if (nestedPressure) return nestedPressure;
    }
    const pressure = classifyProviderPressureMessage(upper);
    if (pressure) return pressure;
    return "AI_PROVIDER_DOWN";
  }

  if (
    name === "AI_APICallError" ||
    name === "APICallError" ||
    name === "GoogleGenerativeAIFetchError" ||
    name === "GoogleApiError" ||
    name === "FetchError" ||
    upper.includes("FETCH FAILED")
  ) {
    if (upper.includes("401") || upper.includes("INVALID API KEY") || upper.includes("UNAUTHENTICATED")) {
      return "AI_KEY_INVALID";
    }
    if (upper.includes("403") || upper.includes("PERMISSION_DENIED") || upper.includes("FORBIDDEN")) {
      return "AI_KEY_INVALID";
    }
    if (upper.includes("429") || upper.includes("RESOURCE_EXHAUSTED") || upper.includes("QUOTA")) {
      return "AI_QUOTA_EXCEEDED";
    }
    if (upper.includes("RATE LIMIT") || upper.includes("TOO MANY REQUESTS")) {
      return "AI_RATE_LIMIT";
    }
    if (upper.includes("NO LONGER AVAILABLE") || upper.includes("MODELS/GEMINI")) {
      return "AI_MODEL_UNAVAILABLE";
    }
    if (upper.includes("PAYLOAD TOO LARGE") || upper.includes("REQUEST ENTITY TOO LARGE")) {
      return "AI_PAYLOAD_TOO_LARGE";
    }
    return "AI_PROVIDER_DOWN";
  }

  if (name === "StorageError" || upper.includes("STORAGE") && (upper.includes("NOT FOUND") || upper.includes("PERMISSION"))) {
    return "AI_STORAGE_ERROR";
  }

  if (isPostgrestError(error) || name === "PostgrestError" || upper.includes("PGRST")) {
    return "AI_DATABASE_ERROR";
  }

  if (upper.includes("401") || upper.includes("INVALID API KEY") || upper.includes("UNAUTHENTICATED")) {
    return "AI_KEY_INVALID";
  }
  if (upper.includes("403") || upper.includes("PERMISSION_DENIED") || upper.includes("FORBIDDEN")) {
    return "AI_KEY_INVALID";
  }
  if (upper.includes("429") || upper.includes("RESOURCE_EXHAUSTED") || upper.includes("QUOTA")) {
    return "AI_QUOTA_EXCEEDED";
  }
  if (upper.includes("RATE LIMIT") || upper.includes("TOO MANY REQUESTS")) {
    return "AI_RATE_LIMIT";
  }
  if (upper.includes("NO LONGER AVAILABLE") || upper.includes("MODEL NOT FOUND")) {
    return "AI_MODEL_UNAVAILABLE";
  }
  if (upper.includes("PAYLOAD TOO LARGE") || upper.includes("TOO LARGE")) {
    return "AI_PAYLOAD_TOO_LARGE";
  }
  if (
    upper.includes("ECONNREFUSED") ||
    upper.includes("ENOTFOUND") ||
    upper.includes("ETIMEDOUT") ||
    upper.includes("NETWORK") ||
    upper.includes("UNAVAILABLE")
  ) {
    return "AI_PROVIDER_DOWN";
  }

  const providerPressure = classifyProviderPressureMessage(upper);
  if (providerPressure) return providerPressure;

  console.warn(
    JSON.stringify({
      event: "UNCLASSIFIED_ERROR",
      errorName: name || null,
      errorMessage: text.slice(0, 500),
    }),
  );
  return "AI_UNKNOWN_ERROR";
}

export function isFailoverEligible(code: AiErrorCode): boolean {
  return (
    code === "AI_RATE_LIMIT" ||
    code === "AI_QUOTA_EXCEEDED" ||
    code === "AI_KEY_INVALID" ||
    code === "AI_PROVIDER_DOWN" ||
    code === "AI_TIMEOUT"
  );
}

export function logUnclassifiedAiError(error: unknown, context: Record<string, string | number | null | undefined>): void {
  const { text, name } = readErrorText(error);
  console.warn(
    JSON.stringify({
      event: "UNCLASSIFIED_ERROR",
      errorName: name || null,
      errorMessage: text.slice(0, 500),
      stack: error instanceof Error ? (error.stack?.slice(0, 800) ?? null) : null,
      ...context,
    }),
  );
}
