import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Client Gemini per Analisi AI report.
 *
 * La quickstart ufficiale Google usa @google/genai; qui usiamo @ai-sdk/google
 * per structured output (generateObject + Zod) — percorso documentato da Google:
 * https://ai.google.dev/gemini-api/docs/vercel-ai-sdk-example
 */

/** Modello default — allineato alla quickstart npm (@google/genai). Fallback: gemini-2.0-flash */
export const GEMINI_REPORT_MODEL_ID = "gemini-2.5-flash";

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

/** Modello Gemini per analisi report — null se API key assente. */
export function getGeminiReportModel() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  const google = createGoogleGenerativeAI({ apiKey });
  return google(GEMINI_REPORT_MODEL_ID);
}
