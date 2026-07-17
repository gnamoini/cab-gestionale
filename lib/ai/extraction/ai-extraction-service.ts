import "server-only";

import type { ZodType } from "zod";
import { aiService } from "@/lib/ai/runtime/service";
import { aiErrorMessage } from "@/lib/ai/runtime/errors";
import { readRuntimeModelForProvider, readRuntimeTimeoutMs } from "@/lib/ai/runtime/env-reader";
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
  messages?: Parameters<typeof import("ai").generateObject>[0]["messages"];
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
  if (!(await aiService.getConfigurationStatus()).configured) {
    throw new Error(aiErrorMessage("AI_CONFIG_MISSING"));
  }

  const sb = await createSupabaseServerUserClient();
  const timeoutMs = input.timeoutMs ?? readRuntimeTimeoutMs();
  const workerId = input.workerId ?? `worker-${input.executionId.slice(0, 8)}`;
  const modelId = readRuntimeModelForProvider("google");

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
    const result = input.messages
      ? await aiService.generateObject<T>({
          schema: input.schema,
          system: input.system,
          messages: input.messages,
          temperature: input.temperature ?? 0.2,
          timeoutMs,
          operation: `import_${input.feature}`,
        })
      : await aiService.generateObject<T>({
          schema: input.schema,
          system: input.system,
          prompt: input.prompt,
          temperature: input.temperature ?? 0.2,
          timeoutMs,
          operation: `import_${input.feature}`,
        });

    if (!result.ok) throw new Error(result.message);

    const durationMs = Math.round(performance.now() - t0);
    const usage = result.data.usage ?? {};
    const tokens = {
      input: Number(usage.inputTokens ?? 0),
      output: Number(usage.outputTokens ?? 0),
    };

    await sb
      .from("import_executions")
      .update({
        provider: "google_gemini",
        model_id: modelId,
        prompt_version: input.promptVersion ?? "1",
        tokens_input: tokens.input,
        tokens_output: tokens.output,
        duration_ms: durationMs,
        heartbeat_at: new Date().toISOString(),
        result: result.data.object as Record<string, unknown>,
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
      data: result.data.object,
      provider: "google_gemini",
      modelId,
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
