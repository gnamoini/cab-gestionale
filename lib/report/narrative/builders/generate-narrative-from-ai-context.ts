import "server-only";

import type { ReportAIContextDto } from "@/lib/report/ai-context/types";
import { buildNarrativePromptContext } from "@/lib/report/narrative/build-narrative-prompt-context";
import type { GenerateNarrativeResult } from "@/lib/report/narrative/contracts/narrative-provider.types";
import {
  narrativeService,
  type NarrativeServiceInvokeOpts,
} from "@/lib/report/narrative/services/narrative-service.server";

/** Application helper — chains buildNarrativePromptContext → narrativeService. */
export async function generateNarrativeFromAiContext(
  aiContext: ReportAIContextDto,
  opts: NarrativeServiceInvokeOpts,
  signal?: AbortSignal,
): Promise<GenerateNarrativeResult> {
  const promptContext = buildNarrativePromptContext(aiContext);
  return narrativeService.generateFromPromptContext(promptContext, opts, signal);
}
