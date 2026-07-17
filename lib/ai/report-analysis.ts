import "server-only";

import { aiService } from "@/lib/ai/runtime/service";
import { aiErrorMessage, classifyAiError } from "@/lib/ai/runtime/errors";
import type { GenerateReportAnalysisResult, ReportAnalysisLlmProvider } from "@/lib/ai/llm-provider.types";
import { REPORT_ANALYSIS_SYSTEM_PROMPT } from "@/lib/ai/report-analysis-prompts";
import {
  reportAnalysisOutputSchema,
  type ReportAnalysisContext,
  type ReportAnalysisOutput,
} from "@/lib/report/report-analysis/report-analysis-schema";
import { readLegacyGoogleKeys, readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";

export async function generateReportAnalysis(
  context: ReportAnalysisContext,
  signal?: AbortSignal,
): Promise<GenerateReportAnalysisResult> {
  const status = await aiService.getConfigurationStatus();
  if (!status.configured) {
    return {
      ok: false,
      code: "not_configured",
      message: aiErrorMessage("AI_CONFIG_MISSING"),
    };
  }

  const timeoutMs = readRuntimeTimeoutMs() > 45_000 ? 45_000 : readRuntimeTimeoutMs();
  if (signal?.aborted) {
    return { ok: false, code: "timeout", message: aiErrorMessage("AI_TIMEOUT") };
  }

  const result = await aiService.generateObject<ReportAnalysisOutput>({
    schema: reportAnalysisOutputSchema,
    system: REPORT_ANALYSIS_SYSTEM_PROMPT,
    prompt: JSON.stringify(context),
    temperature: 0.3,
    operation: "report_analysis",
    timeoutMs,
  });

  if (!result.ok) {
    const code = classifyAiError(new Error(result.message));
    if (code === "AI_TIMEOUT") {
      return { ok: false, code: "timeout", message: aiErrorMessage("AI_TIMEOUT") };
    }
    return {
      ok: false,
      code: "generation_failed",
      message: result.message,
    };
  }

  return { ok: true, data: result.data.object };
}

export const geminiReportAnalysisProvider: ReportAnalysisLlmProvider = {
  isConfigured: () => readLegacyGoogleKeys().length > 0,
  generate: generateReportAnalysis,
};
