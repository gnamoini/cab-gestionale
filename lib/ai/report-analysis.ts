import "server-only";

import { generateObjectWithGeminiFailover } from "@/lib/ai/gemini-generate-object.server";
import {
  GEMINI_AUTH_ERROR_HINT,
  GEMINI_NOT_CONFIGURED_MESSAGE,
  isGeminiAuthError,
  isGeminiConfigured,
  resolveGeminiReportAnalysisTimeoutMs,
} from "@/lib/ai/gemini-client";
import type { GenerateReportAnalysisResult, ReportAnalysisLlmProvider } from "@/lib/ai/llm-provider.types";
import { REPORT_ANALYSIS_SYSTEM_PROMPT } from "@/lib/ai/report-analysis-prompts";
import {
  reportAnalysisOutputSchema,
  type ReportAnalysisContext,
  type ReportAnalysisOutput,
} from "@/lib/report/report-analysis/report-analysis-schema";

function logGenerationError(error: unknown): void {
  if (error instanceof Error) {
    console.error("[report-analysis] generateObject failed:", error.name, error.message);
    return;
  }
  console.error("[report-analysis] generateObject failed:", String(error));
}

export async function generateReportAnalysis(
  context: ReportAnalysisContext,
  signal?: AbortSignal,
): Promise<GenerateReportAnalysisResult> {
  if (!isGeminiConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      message: GEMINI_NOT_CONFIGURED_MESSAGE,
    };
  }

  const timeoutMs = resolveGeminiReportAnalysisTimeoutMs();
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  try {
    const { object: rawObject } = await generateObjectWithGeminiFailover({
      schema: reportAnalysisOutputSchema,
      system: REPORT_ANALYSIS_SYSTEM_PROMPT,
      prompt: JSON.stringify(context),
      temperature: 0.3,
      abortSignal: combinedSignal,
    });
    const object = rawObject as ReportAnalysisOutput;

    return { ok: true, data: object };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        ok: false,
        code: "timeout",
        message: "Analisi AI scaduta per timeout. Riprova con un periodo più corto o più tardi.",
      };
    }
    logGenerationError(error);
    if (isGeminiAuthError(error)) {
      return {
        ok: false,
        code: "generation_failed",
        message: GEMINI_AUTH_ERROR_HINT,
      };
    }
    return {
      ok: false,
      code: "generation_failed",
      message: "Generazione analisi non riuscita. Verifica la chiave Gemini e riprova.",
    };
  }
}

export const geminiReportAnalysisProvider: ReportAnalysisLlmProvider = {
  isConfigured: isGeminiConfigured,
  generate: generateReportAnalysis,
};
