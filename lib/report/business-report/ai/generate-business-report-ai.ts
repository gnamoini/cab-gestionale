import "server-only";

import { aiService } from "@/lib/ai/runtime/service";
import { aiErrorMessage, classifyAiError } from "@/lib/ai/runtime/errors";
import { readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";
import {
  businessReportAiOutputSchema,
  type BusinessReportAiOutput,
} from "@/lib/report/business-report/schema/business-report-ai-output-schema";
import { BUSINESS_REPORT_SYSTEM_PROMPT } from "@/lib/report/business-report/prompt/business-report-system-prompt";
import {
  buildBusinessReportAiPromptContext,
  type BusinessReportRuntimeContext,
} from "@/lib/report/business-report/context/build-business-report-context";

export type GenerateBusinessReportAiResult =
  | { ok: true; data: BusinessReportAiOutput; model: string; durationMs: number }
  | { ok: false; code: string; message: string; durationMs: number };

export async function generateBusinessReportAi(
  ctx: BusinessReportRuntimeContext,
  signal?: AbortSignal,
): Promise<GenerateBusinessReportAiResult> {
  const started = Date.now();
  if (signal?.aborted) {
    return { ok: false, code: "timeout", message: aiErrorMessage("AI_TIMEOUT"), durationMs: 0 };
  }

  const status = await aiService.getConfigurationStatus();
  if (!status.configured) {
    return {
      ok: false,
      code: "not_configured",
      message: aiErrorMessage("AI_CONFIG_MISSING"),
      durationMs: Date.now() - started,
    };
  }

  const promptContext = buildBusinessReportAiPromptContext(ctx);
  const timeoutMs = Math.min(readRuntimeTimeoutMs(), 45_000);

  const result = await aiService.generateObject<BusinessReportAiOutput>({
    schema: businessReportAiOutputSchema,
    system: BUSINESS_REPORT_SYSTEM_PROMPT,
    prompt: JSON.stringify(promptContext),
    temperature: 0.25,
    operation: "business_report",
    provider: status.provider,
    timeoutMs,
  });

  const durationMs = Date.now() - started;

  if (!result.ok) {
    const code = result.code ?? classifyAiError(new Error("ai_failed"));
    return { ok: false, code, message: aiErrorMessage(code), durationMs };
  }

  return { ok: true, data: result.data.object, model: status.modelId, durationMs };
}
