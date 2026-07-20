import type { GeneratedNarrativeDto, NarrativePromptContext } from "@/lib/report/narrative/types";
import type { NarrativeProviderId } from "@/lib/report/narrative/types";

export type GenerateNarrativeResult =
  | { ok: true; data: GeneratedNarrativeDto }
  | {
      ok: false;
      code: "not_configured" | "generation_failed" | "timeout" | "validation_failed" | "quality_failed" | "rate_limited";
      message: string;
    };

export type NarrativeLlmProvider = {
  readonly id: NarrativeProviderId;
  isConfigured(): boolean;
  generate(input: NarrativePromptContext, signal?: AbortSignal): Promise<GenerateNarrativeResult>;
};
