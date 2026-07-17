import "server-only";

import { generateObject, type LanguageModel } from "ai";
import { isGeminiModelUnavailableError } from "@/lib/ai/gemini-api-keys";
import {
  GEMINI_REPORT_MODEL_ID,
  getGeminiReportModelForApiKey,
  listGeminiApiKeys,
  resolveGeminiReportModelId,
  runWithGeminiFailover,
} from "@/lib/ai/gemini-client";
import {
  logGeminiRequestCompleted,
  logGeminiRequestFailed,
  logGeminiRequestStarted,
} from "@/lib/ai/gemini-observability.server";

type GenerateObjectInput = Parameters<typeof generateObject>[0];

async function generateObjectWithModelUnavailableFallback(
  rest: Omit<GenerateObjectInput, "model">,
  model: LanguageModel,
  apiKey: string,
): Promise<Awaited<ReturnType<typeof generateObject>>> {
  try {
    return await generateObject({ ...rest, model } as GenerateObjectInput);
  } catch (error) {
    if (!isGeminiModelUnavailableError(error)) throw error;
    const fallbackModel = getGeminiReportModelForApiKey(apiKey, GEMINI_REPORT_MODEL_ID);
    return generateObject({ ...rest, model: fallbackModel } as GenerateObjectInput);
  }
}

/** generateObject con failover primaria → secondaria su quota/auth. */
export async function generateObjectWithGeminiFailover(
  input: Record<string, unknown> & { model?: LanguageModel },
): Promise<Awaited<ReturnType<typeof generateObject>>> {
  const { model: overrideModel, ...rest } = input;
  if (overrideModel) {
    return generateObject({ ...rest, model: overrideModel } as GenerateObjectInput);
  }
  return runWithGeminiFailover((model, meta) => {
    const apiKey = listGeminiApiKeys()[meta.keyIndex];
    if (!apiKey) throw new Error("Gemini API key not configured");
    const operation = "generate_object";
    const modelId = resolveGeminiReportModelId();
    const t0 = performance.now();
    logGeminiRequestStarted({ model: modelId, operation });
    return generateObjectWithModelUnavailableFallback(
      rest as Omit<GenerateObjectInput, "model">,
      model,
      apiKey,
    )
      .then((result) => {
        logGeminiRequestCompleted({
          model: modelId,
          operation,
          durationMs: Math.round(performance.now() - t0),
        });
        return result;
      })
      .catch((error) => {
        logGeminiRequestFailed({
          model: modelId,
          operation,
          durationMs: Math.round(performance.now() - t0),
          errorCode: "UNKNOWN",
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        throw error;
      });
  });
}
