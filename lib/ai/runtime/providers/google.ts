import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { AiProviderId } from "@/lib/ai/runtime/types";
import { readRuntimeModelForProvider } from "@/lib/ai/runtime/env-reader";

const DEPRECATED_GOOGLE_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
]);

export function normalizeGoogleModelId(modelId: string): string {
  const trimmed = modelId.trim();
  return DEPRECATED_GOOGLE_MODELS.has(trimmed) ? "gemini-3.5-flash" : trimmed;
}

export function createLanguageModel(
  provider: AiProviderId,
  apiKey: string,
  modelId?: string,
): LanguageModel {
  const resolvedModel = modelId?.trim() || readRuntimeModelForProvider(provider);
  if (provider === "google") {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(normalizeGoogleModelId(resolvedModel));
  }
  throw new Error(`Provider non supportato: ${provider}`);
}
