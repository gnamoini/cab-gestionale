export {
  GENERATED_NARRATIVE_CONTRACT_VERSION,
  NARRATIVE_PROMPT_CONTEXT_VERSION,
  NARRATIVE_PROVIDER_IDS,
} from "@/lib/report/narrative/types";
export type {
  GeneratedNarrativeContractVersion,
  GeneratedNarrativeDto,
  GeneratedNarrativeSection,
  NarrativeModelMetadata,
  NarrativePromptContext,
  NarrativePromptContextVersion,
  NarrativePromptSignal,
  NarrativeProviderId,
} from "@/lib/report/narrative/types";
export type {
  GenerateNarrativeResult,
  NarrativeLlmProvider,
} from "@/lib/report/narrative/contracts/narrative-provider.types";
export {
  generatedNarrativeDtoSchema,
  generatedNarrativeSectionSchema,
  narrativePromptContextSchema,
  narrativePromptSignalSchema,
} from "@/lib/report/narrative/narrative-schema";
export { buildNarrativePromptContext } from "@/lib/report/narrative/build-narrative-prompt-context";
export { validateGeneratedNarrative } from "@/lib/report/narrative/validate-generated-narrative";
export { buildGeneratedNarrativeDto } from "@/lib/report/narrative/builders/build-generated-narrative-dto";
export { geminiNarrativeProvider } from "@/lib/report/narrative/providers/gemini-adapter";
