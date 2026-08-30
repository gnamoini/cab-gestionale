import "server-only";

import { generateObject } from "ai";
import { aiService } from "@/lib/ai/runtime/service";
import type { AiGenerateObjectMessages, AiGenerateObjectSchema } from "@/lib/ai/runtime/generate-object-types";

type GenerateObjectInput = {
  schema: AiGenerateObjectSchema;
  system?: string;
  messages?: AiGenerateObjectMessages;
  prompt?: string;
  temperature?: number;
  abortSignal?: AbortSignal;
  model?: unknown;
};

/** @deprecated Use aiService.generateObject from @/lib/ai/runtime/service */
export async function generateObjectWithGeminiFailover(
  input: GenerateObjectInput,
): Promise<Awaited<ReturnType<typeof generateObject>>> {
  const { abortSignal, ...rest } = input;
  const timeoutMs =
    abortSignal != null && typeof AbortSignal.timeout === "function" ? 90_000 : readTimeout(abortSignal);
  const result = await aiService.generateObject({
    ...rest,
    timeoutMs,
    operation: "generate_object_legacy",
  });
  if (!result.ok) {
    throw new Error(result.message);
  }
  return {
    object: result.data.object,
    usage: result.data.usage,
    response: result.data.response,
  } as Awaited<ReturnType<typeof generateObject>>;
}

function readTimeout(signal?: AbortSignal): number | undefined {
  if (!signal) return undefined;
  return 90_000;
}
