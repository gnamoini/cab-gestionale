import "server-only";

import { generateObject } from "ai";
import { getGeminiReportModel, isGeminiConfigured } from "@/lib/ai/gemini-client";
import type { GenerateReportAnalysisResult, ReportAnalysisLlmProvider } from "@/lib/ai/llm-provider.types";
import { REPORT_ANALYSIS_SYSTEM_PROMPT } from "@/lib/ai/report-analysis-prompts";
import {
  reportAnalysisOutputSchema,
  type ReportAnalysisContext,
} from "@/lib/report/report-analysis/report-analysis-schema";

const DEFAULT_TIMEOUT_MS = 45_000;

const GEMINI_AUTH_ERROR_HINT =
  "Chiave Gemini non valida. Genera una nuova chiave su Google AI Studio (formato AIza...) e impostala in GOOGLE_GENERATIVE_AI_API_KEY o GEMINI_API_KEY.";

const NOT_CONFIGURED_MESSAGE =
  "Servizio Analisi AI non configurato. Imposta GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY o GOOGLE_API_KEY.";

function resolveTimeoutMs(): number {
  const raw = process.env.REPORT_ANALYSIS_LLM_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

function isGeminiAuthError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  const upper = text.toUpperCase();
  return (
    upper.includes("401") ||
    upper.includes("403") ||
    upper.includes("API KEY") ||
    upper.includes("API_KEY") ||
    upper.includes("PERMISSION_DENIED") ||
    upper.includes("UNAUTHENTICATED") ||
    upper.includes("INVALID API KEY")
  );
}

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
  const model = getGeminiReportModel();
  if (!model) {
    return {
      ok: false,
      code: "not_configured",
      message: NOT_CONFIGURED_MESSAGE,
    };
  }

  const timeoutMs = resolveTimeoutMs();
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  try {
    const { object } = await generateObject({
      model,
      schema: reportAnalysisOutputSchema,
      system: REPORT_ANALYSIS_SYSTEM_PROMPT,
      prompt: JSON.stringify(context),
      temperature: 0.3,
      abortSignal: combinedSignal,
    });

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
