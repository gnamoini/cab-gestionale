import type { generateObject } from "ai";

/** ponytail: overload-safe extract — Parameters[0]["schema"] breaks on ai SDK unions. */
export type AiGenerateObjectSchema = NonNullable<
  Extract<Parameters<typeof generateObject>[0], { schema?: unknown }>["schema"]
>;

export type AiGenerateObjectMessages = Parameters<typeof generateObject>[0]["messages"];
