import "server-only";

import { generateObject, type LanguageModel } from "ai";
import { runWithGeminiFailover } from "@/lib/ai/gemini-client";

type GenerateObjectInput = Parameters<typeof generateObject>[0];

/** generateObject con failover primaria → secondaria su quota/auth. */
export async function generateObjectWithGeminiFailover(
  input: Record<string, unknown> & { model?: LanguageModel },
): Promise<Awaited<ReturnType<typeof generateObject>>> {
  const { model: overrideModel, ...rest } = input;
  if (overrideModel) {
    return generateObject({ ...rest, model: overrideModel } as GenerateObjectInput);
  }
  return runWithGeminiFailover((model) =>
    generateObject({ ...rest, model } as GenerateObjectInput),
  );
}
