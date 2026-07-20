import {
  GENERATED_NARRATIVE_CONTRACT_VERSION,
  type GeneratedNarrativeDto,
} from "@/lib/report/narrative/types";
import type { GeneratedNarrativeContent } from "@/lib/report/narrative/providers/generated-narrative-content-schema";

export function buildGeneratedNarrativeDto(
  content: GeneratedNarrativeContent,
  meta: { model: string; latencyMs?: number },
): GeneratedNarrativeDto {
  return {
    contractVersion: GENERATED_NARRATIVE_CONTRACT_VERSION,
    sections: content.sections.map((section) => ({
      ruleKey: section.ruleKey,
      metricIds: [...section.metricIds],
      explanation: section.explanation,
      sourceTrust: section.sourceTrust,
    })),
    disclaimer: content.disclaimer,
    generatedAt: new Date().toISOString(),
    modelMetadata: {
      provider: "gemini",
      model: meta.model,
      latencyMs: meta.latencyMs,
    },
  };
}
