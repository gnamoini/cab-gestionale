import "server-only";

import { generateObject } from "ai";
import {
  GEMINI_FILE_ANALYSIS_TIMEOUT_MS,
  GEMINI_NOT_CONFIGURED_MESSAGE,
  getGeminiReportModel,
  isGeminiConfigured,
} from "@/lib/ai/gemini-client";
import type { CaptureExtractionResult } from "@/lib/document-capture/capture-extraction-schema";
import { captureExtractionSchema } from "@/lib/document-capture/capture-extraction-schema";
import {
  loadPipelineState,
  saveDocumentModelAndPipelineState,
} from "@/lib/document-capture/document-model-service.server";
import { mutateCaptureWithEvent } from "@/lib/document-capture/mutate-capture-with-event.server";
import type { ExtractionResult } from "@/lib/document-capture/model/extraction-result";
import { INITIAL_PIPELINE_STATE } from "@/lib/document-capture/model/pipeline-state";
import { markUploadUploaded, advancePipelineStateForPhase } from "@/lib/document-capture/orchestrator/pipeline-state-advance";
import {
  findPipelineExecution,
  savePipelineExecution,
} from "@/lib/document-capture/orchestrator/pipeline-execution-store.server";
import { buildPipelineIdempotencyKey } from "@/lib/document-capture/orchestrator/pipeline-orchestrator";
import { tracePipelinePhase } from "@/lib/document-capture/observability/pipeline-observability.server";
import { parsePhysicalPages } from "@/lib/document-capture/physical/physical-parser";
import { projectDocumentModelToFlatFields } from "@/lib/document-capture/projection/document-model-flat-projection";
import {
  ensureSchedaOfficinaPluginRegistered,
  runSchedaPipelineViews,
} from "@/lib/document-capture/registry/scheda-officina-plugin";
import { schedaOfficinaPromptContract } from "@/lib/document-capture/registry/prompt-contract";
import { classifyStorageDownloadError } from "@/lib/storage/storage-download-errors";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

const RETRY_BACKOFF_MS = [1_000, 3_000] as const;

export type AnalyzeCaptureV41Result =
  | {
      ok: true;
      attemptId: string;
      durationMs: number;
      reused: boolean;
      documentModelVersionHash: string;
    }
  | { ok: false; code: "not_configured" | "not_finalized" | "failed"; message: string };

function legacyToExtractionResult(
  attemptId: string,
  legacy: CaptureExtractionResult,
  meta: ExtractionResult["modelMetadata"],
): ExtractionResult {
  const fields = Object.entries(legacy.fields).map(([key, field], idx) => ({
    key,
    value: field.value,
    confidence: field.confidence,
    pageIndex: Math.min(idx, Math.max(0, (meta.pageCount ?? 1) - 1)),
  }));
  return {
    attemptId,
    promptContractId: schedaOfficinaPromptContract.id,
    outputSchemaVersion: schedaOfficinaPromptContract.outputSchemaVersion,
    fields,
    modelMetadata: meta,
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeDocumentCaptureV41(
  captureId: string,
  userId: string,
): Promise<AnalyzeCaptureV41Result> {
  const model = getGeminiReportModel();
  if (!model || !isGeminiConfigured()) {
    return { ok: false, code: "not_configured", message: GEMINI_NOT_CONFIGURED_MESSAGE };
  }

  const sb = await createSupabaseServerUserClient();
  const { data: capture, error } = await sb
    .from("document_capture")
    .select("id, company_id, storage_path, finalized_at, mime, capture_version, status")
    .eq("id", captureId)
    .maybeSingle();

  if (error || !capture?.finalized_at) {
    return { ok: false, code: "not_finalized", message: "Documento non finalizzato." };
  }

  const idempotencyKey = buildPipelineIdempotencyKey("ai_extract", captureId, `v${capture.capture_version}`);
  const existing = await findPipelineExecution(idempotencyKey);
  if (existing?.status === "completed" && existing.resultRef) {
    const doc = await sb
      .from("document_capture")
      .select("document_model")
      .eq("id", captureId)
      .maybeSingle();
    const hash =
      (doc.data?.document_model as { metadata?: { contentHash?: string } } | null)?.metadata?.contentHash ?? "";
    return { ok: true, attemptId: existing.resultRef, durationMs: 0, reused: true, documentModelVersionHash: hash };
  }

  await mutateCaptureWithEvent({
    captureId,
    eventType: "analyze_started",
    idempotencyKey: `analyze_started:${capture.capture_version}`,
    payload: { captureVersion: capture.capture_version, pipeline: "v4.1" },
    newStatus: "analyzing",
  });

  const { data: fileData, error: dlError } = await sb.storage
    .from(STORAGE_BUCKETS.documentCapture)
    .download(capture.storage_path);
  if (dlError || !fileData) {
    const classified = classifyStorageDownloadError(
      dlError,
      Boolean(fileData),
      STORAGE_BUCKETS.documentCapture,
      "analisi documento",
    );
    await mutateCaptureWithEvent({
      captureId,
      eventType: "analyze_failed",
      idempotencyKey: `analyze_failed:download:${capture.capture_version}`,
      payload: { errorCode: classified.code },
      newStatus: "failed",
    });
    return { ok: false, code: "failed", message: classified.message };
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer());
  const mime = capture.mime ?? fileData.type ?? "application/pdf";
  const plugin = ensureSchedaOfficinaPluginRegistered();
  const t0 = performance.now();

  let pipelineState = markUploadUploaded((await loadPipelineState(captureId)) ?? { ...INITIAL_PIPELINE_STATE });

  const pageObjects = await parsePhysicalPages(bytes);
  tracePipelinePhase({ captureId, phase: "physical_parse", outcome: "ok" });

  let lastError: unknown;
  let attemptId = "";
  let usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;

  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt += 1) {
    try {
      const { object, usage: u, response } = await generateObject({
        model,
        schema: captureExtractionSchema,
        system: schedaOfficinaPromptContract.systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: schedaOfficinaPromptContract.userPromptTemplate },
              { type: "file", data: Buffer.from(bytes), mediaType: mime },
            ],
          },
        ],
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(GEMINI_FILE_ANALYSIS_TIMEOUT_MS),
      });
      usage = u;
      const { count } = await sb
        .from("document_capture_attempts")
        .select("id", { count: "exact", head: true })
        .eq("document_capture_id", captureId);
      const attemptNumber = (count ?? 0) + 1;
      const providerRequestId =
        response && typeof response === "object" && "id" in response
          ? String((response as { id?: string }).id ?? "")
          : null;

      const durationMs = Math.round(performance.now() - t0);
      const extractionResult = legacyToExtractionResult("pending", object, {
        modelId: "gemini",
        promptContractId: schedaOfficinaPromptContract.id,
        promptVersion: schedaOfficinaPromptContract.version,
        outputSchemaVersion: schedaOfficinaPromptContract.outputSchemaVersion,
        projectorVersion: schedaOfficinaPromptContract.projectorVersion,
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        totalTokens: usage?.totalTokens,
        latencyMs: durationMs,
        pageCount: pageObjects.length,
      });

      const document = plugin.projectToModel({
        captureId,
        pageObjects,
        extraction: extractionResult,
        updatedBy: userId,
      });
      const { validation } = runSchedaPipelineViews(document);
      void validation;

      const { data: attempt, error: insError } = await sb
        .from("document_capture_attempts")
        .insert({
          company_id: capture.company_id,
          document_capture_id: captureId,
          attempt_number: attemptNumber,
          provider: "google",
          model: "gemini",
          structured_response: object,
          extraction_result: { ...extractionResult, attemptId: "pending" },
          prompt_contract_id: schedaOfficinaPromptContract.id,
          prompt_version: schedaOfficinaPromptContract.version,
          metadata: extractionResult.modelMetadata,
          status: "completed",
          input_tokens: usage?.inputTokens ?? null,
          output_tokens: usage?.outputTokens ?? null,
          total_tokens: usage?.totalTokens ?? null,
          duration_ms: durationMs,
          provider_request_id: providerRequestId,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insError || !attempt) throw new Error(insError?.message ?? "Salvataggio attempt fallito.");
      attemptId = attempt.id;
      extractionResult.attemptId = attemptId;

      const flatFields = projectDocumentModelToFlatFields(document);
      const fieldRows = flatFields.map((f) => ({
        company_id: capture.company_id,
        document_capture_id: captureId,
        attempt_id: attemptId,
        field_key: f.fieldKey,
        raw_value: f.value,
        normalized_value: f.value,
        confidence: f.confidence,
        value_source: "ai" as const,
      }));
      if (fieldRows.length > 0) {
        await sb.from("document_capture_fields").upsert(fieldRows, {
          onConflict: "document_capture_id,field_key",
        });
      }

      pipelineState = advancePipelineStateForPhase(pipelineState, "ai_extract", true);
      pipelineState = advancePipelineStateForPhase(pipelineState, "validate", validation.status !== "blocked");
      await saveDocumentModelAndPipelineState({ captureId, document, pipelineState });

      await savePipelineExecution({
        id: crypto.randomUUID(),
        captureId,
        phase: "ai_extract",
        idempotencyKey,
        status: "completed",
        completedAt: new Date().toISOString(),
        resultRef: attemptId,
      });

      await mutateCaptureWithEvent({
        captureId,
        eventType: "analyze_completed",
        idempotencyKey: `analyze_completed:${attemptId}`,
        payload: {
          attemptId,
          durationMs,
          fieldCount: fieldRows.length,
          pipeline: "v4.1",
          documentModelVersionHash: document.metadata.contentHash,
        },
        newStatus: "review",
      });

      return {
        ok: true,
        attemptId,
        durationMs,
        reused: false,
        documentModelVersionHash: document.metadata.contentHash,
      };
    } catch (e) {
      lastError = e;
      if (attempt < RETRY_BACKOFF_MS.length) await sleep(RETRY_BACKOFF_MS[attempt] ?? 1_000);
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Analisi non riuscita.";
  await mutateCaptureWithEvent({
    captureId,
    eventType: "analyze_failed",
    idempotencyKey: `analyze_failed:${capture.capture_version}`,
    payload: { errorCode: "analyze_failed", message, pipeline: "v4.1" },
    newStatus: "failed",
  });
  return { ok: false, code: "failed", message };
}
