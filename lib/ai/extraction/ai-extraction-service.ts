import "server-only";

import { generateObject, type LanguageModel } from "ai";
import type { ZodType } from "zod";
import {
  GEMINI_FILE_ANALYSIS_TIMEOUT_MS,
  GEMINI_NOT_CONFIGURED_MESSAGE,
  requireGeminiReportModel,
  isGeminiConfigured,
} from "@/lib/ai/gemini-client";
import { writeImportAuditEvent } from "@/lib/import-core/import-audit-events.server";
import type { ImportExecutionFeature } from "@/lib/import-core/types";
import { touchImportExecutionHeartbeat, updateImportExecutionStatus } from "@/lib/import-core/import-executions.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export type AiExtractionRequest<T> = {
  companyId: string;
  correlationId: string;
  executionId: string;
  feature: ImportExecutionFeature;
  schema: ZodType<T>;
  system: string;
  prompt: string;
  messages?: Parameters<typeof generateObject>[0]["messages"];
  model?: LanguageModel;
  timeoutMs?: number;
  temperature?: number;
  promptVersion?: string;
  workerId?: string;
  createdBy?: string | null;
  importFileId?: string;
};

export type AiExtractionResult<T> = {
  data: T;
  provider: "google_gemini";
  modelId: string;
  promptVersion: string;
  durationMs: number;
  tokens: { input: number; output: number };
};

export async function runAiExtraction<T>(input: AiExtractionRequest<T>): Promise<AiExtractionResult<T>> {
  if (!isGeminiConfigured()) {
    throw new Error(GEMINI_NOT_CONFIGURED_MESSAGE);
  }

  const sb = await createSupabaseServerUserClient();
  const model = input.model ?? requireGeminiReportModel();
  const timeoutMs = input.timeoutMs ?? GEMINI_FILE_ANALYSIS_TIMEOUT_MS;
  const workerId = input.workerId ?? `worker-${input.executionId.slice(0, 8)}`;

  await updateImportExecutionStatus(sb, {
    executionId: input.executionId,
    status: "ai_processing",
    workerId,
    touchHeartbeat: true,
  });

  await writeImportAuditEvent(sb, {
    companyId: input.companyId,
    correlationId: input.correlationId,
    eventType: "AI_STARTED",
    severity: "info",
    createdBy: input.createdBy,
    importFileId: input.importFileId,
    executionId: input.executionId,
    payload: { feature: input.feature },
  });

  const t0 = performance.now();
  try {
    const baseInput = {
      model,
      schema: input.schema,
      system: input.system,
      temperature: input.temperature ?? 0.2,
      abortSignal: AbortSignal.timeout(timeoutMs),
    };
    const result = input.messages
      ? await generateObject({ ...baseInput, messages: input.messages })
      : await generateObject({ ...baseInput, prompt: input.prompt });
    const durationMs = Math.round(performance.now() - t0);
    const usage = result.usage ?? {};
    const tokens = {
      input: Number(usage.inputTokens ?? 0),
      output: Number(usage.outputTokens ?? 0),
    };

    await sb
      .from("import_executions")
      .update({
        provider: "google_gemini",
        model_id: "gemini-2.5-flash",
        prompt_version: input.promptVersion ?? "1",
        tokens_input: tokens.input,
        tokens_output: tokens.output,
        duration_ms: durationMs,
        heartbeat_at: new Date().toISOString(),
        result: result.object as Record<string, unknown>,
      })
      .eq("id", input.executionId);

    await writeImportAuditEvent(sb, {
      companyId: input.companyId,
      correlationId: input.correlationId,
      eventType: "AI_COMPLETED",
      severity: "info",
      createdBy: input.createdBy,
      importFileId: input.importFileId,
      executionId: input.executionId,
      payload: { feature: input.feature, durationMs, tokens },
    });

    return {
      data: result.object as T,
      provider: "google_gemini",
      modelId: "gemini-2.5-flash",
      promptVersion: input.promptVersion ?? "1",
      durationMs,
      tokens,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI extraction failed";
    const errorCode = message.includes("timeout") || message.includes("aborted") ? "AI_TIMEOUT" : "AI_PARSE_ERROR";

    await updateImportExecutionStatus(sb, {
      executionId: input.executionId,
      status: "failed",
      errorCode,
    });

    await writeImportAuditEvent(sb, {
      companyId: input.companyId,
      correlationId: input.correlationId,
      eventType: "FAILED",
      severity: "error",
      createdBy: input.createdBy,
      importFileId: input.importFileId,
      executionId: input.executionId,
      payload: { errorCode, message },
    });

    throw error;
  } finally {
    await touchImportExecutionHeartbeat(sb, input.executionId, workerId).catch(() => undefined);
  }
}
