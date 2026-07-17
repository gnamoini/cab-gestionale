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
  AI_QUOTA_EXCEEDED: "Quota provider esaurita. Riprova più tardi o usa una chiave alternativa.",
  AI_PROVIDER_DOWN: "Provider AI temporaneamente non raggiungibile. Riprova tra poco.",
  AI_TIMEOUT: "Timeout durante l'analisi AI. Riduci il documento o riprova.",
  AI_UNKNOWN_ERROR: "Errore imprevisto durante l'elaborazione AI.",
};

export function aiErrorMessage(code: AiErrorCode): string {
  return MESSAGES[code];
}

export function classifyAiError(error: unknown): AiErrorCode {
  const text = error instanceof Error ? error.message : String(error);
  const upper = text.toUpperCase();
  const name = error instanceof Error ? error.name : "";

  if (name === "TimeoutError" || upper.includes("TIMEOUT") || upper.includes("ABORT")) {
    return "AI_TIMEOUT";
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
  if (
    upper.includes("ECONNREFUSED") ||
    upper.includes("ENOTFOUND") ||
    upper.includes("ETIMEDOUT") ||
    upper.includes("FETCH FAILED") ||
    upper.includes("NETWORK") ||
    upper.includes("UNAVAILABLE")
  ) {
    return "AI_PROVIDER_DOWN";
  }
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
