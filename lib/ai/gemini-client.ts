import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * AI-SSOT-1: unica fonte di verità Gemini.
 * API key, modello, client, auth handling, timeout constants, messaggi comuni.
 * Nessuna feature deve leggere process.env.GEMINI_* direttamente.
 */

/** Modello default — allineato alla quickstart npm (@google/genai). */
export const GEMINI_REPORT_MODEL_ID = "gemini-2.5-flash";

/** Timeout default analisi testo (Report AI). Override: REPORT_ANALYSIS_LLM_TIMEOUT_MS. */
export const GEMINI_REPORT_ANALYSIS_TIMEOUT_MS_DEFAULT = 45_000;

/** Timeout analisi file (PDF/immagini) — document capture, import listino/ordini. */
export const GEMINI_FILE_ANALYSIS_TIMEOUT_MS = 90_000;

export const GEMINI_NOT_CONFIGURED_MESSAGE =
  "Servizio Analisi AI non configurato. Imposta GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY o GOOGLE_API_KEY.";

export const GEMINI_AUTH_ERROR_HINT =
  "Chiave Gemini non valida. Genera una nuova chiave su Google AI Studio (formato AIza...) e impostala in GOOGLE_GENERATIVE_AI_API_KEY o GEMINI_API_KEY.";

const ENV_KEY_NAMES = [
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
] as const;

function readEnvKey(name: (typeof ENV_KEY_NAMES)[number]): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

/** Risolve la API key: Vercel AI SDK name → nomi ufficiali Google quickstart. */
export function getGeminiApiKey(): string | null {
  for (const name of ENV_KEY_NAMES) {
    const key = readEnvKey(name);
    if (key) return key;
  }
  return null;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export function resolveGeminiReportAnalysisTimeoutMs(): number {
  const raw = process.env.REPORT_ANALYSIS_LLM_TIMEOUT_MS?.trim();
  if (!raw) return GEMINI_REPORT_ANALYSIS_TIMEOUT_MS_DEFAULT;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : GEMINI_REPORT_ANALYSIS_TIMEOUT_MS_DEFAULT;
}

export function isGeminiAuthError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  const upper = text.toUpperCase();
  return (
    upper.includes("401") ||
    upper.includes("403") ||
    upper.includes("API KEY") ||
    upper.includes("API_KEY") ||
    upper.includes("PERMISSION_DENIED") ||
    upper.includes("UNAUTHENTICATED") ||
    upper.includes("INVALID API KEY")
  );
}

/** Modello Gemini — null se API key assente. */
export function getGeminiReportModel() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  const google = createGoogleGenerativeAI({ apiKey });
  return google(GEMINI_REPORT_MODEL_ID);
}
