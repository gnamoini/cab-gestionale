import "server-only";

import { aiService } from "@/lib/ai/runtime/service";
import { aiErrorMessage, classifyAiError } from "@/lib/ai/runtime/errors";
import { readLegacyGoogleKeys, readRuntimeModelForProvider } from "@/lib/ai/runtime/env-reader";
import type { GenerateNarrativeResult, NarrativeLlmProvider } from "@/lib/report/narrative/contracts/narrative-provider.types";
import { buildGeneratedNarrativeDto } from "@/lib/report/narrative/builders/build-generated-narrative-dto";
import type { GeneratedNarrativeContent } from "@/lib/report/narrative/providers/generated-narrative-content-schema";
import { generatedNarrativeContentSchema } from "@/lib/report/narrative/providers/generated-narrative-content-schema";
import {
  NARRATIVE_PROVIDER_OPERATION,
  NARRATIVE_PROVIDER_TEMPERATURE,
  resolveNarrativeProviderTimeoutMs,
} from "@/lib/report/narrative/providers/narrative-provider-policy";
import { NARRATIVE_SYSTEM_PROMPT } from "@/lib/report/narrative/providers/narrative-system-prompt";
import type { NarrativePromptContext } from "@/lib/report/narrative/types";
import { validateGeneratedNarrative } from "@/lib/report/narrative/validate-generated-narrative";
import { emitNarrativeQualityTelemetry } from "@/lib/report/narrative/quality/emit-narrative-quality-telemetry";
import { validateNarrativeQuality } from "@/lib/report/narrative/quality/validate-narrative-quality";

export const geminiNarrativeProvider: NarrativeLlmProvider = {
  id: "gemini",

  isConfigured(): boolean {
    return readLegacyGoogleKeys().length > 0;
  },

  async generate(
    promptContext: NarrativePromptContext,
    signal?: AbortSignal,
  ): Promise<GenerateNarrativeResult> {
    if (signal?.aborted) {
      return { ok: false, code: "timeout", message: aiErrorMessage("AI_TIMEOUT") };
    }

    const status = await aiService.getConfigurationStatus();
    if (!status.configured) {
      return { ok: false, code: "not_configured", message: aiErrorMessage("AI_CONFIG_MISSING") };
    }

    const timeoutMs = resolveNarrativeProviderTimeoutMs();
    const t0 = Date.now();
    const model = readRuntimeModelForProvider("google");

    const result = await aiService.generateObject<GeneratedNarrativeContent>({
      schema: generatedNarrativeContentSchema,
      system: NARRATIVE_SYSTEM_PROMPT,
      prompt: JSON.stringify(promptContext),
      temperature: NARRATIVE_PROVIDER_TEMPERATURE,
      operation: NARRATIVE_PROVIDER_OPERATION,
      provider: "google",
      timeoutMs,
    });

    if (!result.ok) {
      const code = classifyAiError(new Error(result.message));
      if (code === "AI_TIMEOUT") {
        return { ok: false, code: "timeout", message: aiErrorMessage("AI_TIMEOUT") };
      }
      return { ok: false, code: "generation_failed", message: result.message };
    }

    const content = result.data.object;
    const validation = validateGeneratedNarrative(content, promptContext);
    if (!validation.ok) {
      return { ok: false, code: "validation_failed", message: validation.reason };
    }

    const quality = validateNarrativeQuality(content, promptContext);
    emitNarrativeQualityTelemetry(quality.report);
    if (!quality.ok) {
      return { ok: false, code: "quality_failed", message: quality.reason };
    }

    return {
      ok: true,
      data: buildGeneratedNarrativeDto(content, {
        model: result.meta.modelId ?? model,
        latencyMs: Date.now() - t0,
      }),
    };
  },
};
