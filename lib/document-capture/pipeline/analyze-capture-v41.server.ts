import "server-only";

import { generateObjectWithGeminiFailover } from "@/lib/ai/gemini-generate-object.server";
import {
  GEMINI_FILE_ANALYSIS_TIMEOUT_MS,
  GEMINI_NOT_CONFIGURED_MESSAGE,
  resolveGeminiConfigurationGate,
} from "@/lib/ai/gemini-client";
import type { GeminiErrorType } from "@/lib/ai/gemini-error-types";
import type { CaptureExtractionResult } from "@/lib/document-capture/capture-extraction-schema";
import { captureExtractionSchema, listCaptureExtractionFields } from "@/lib/document-capture/capture-extraction-schema";
import { buildGeminiCaptureDocumentPart } from "@/lib/document-capture/gemini-capture-content";
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
import { normalizeCaptureMime } from "@/lib/document-capture/capture-mime";
import {
  applyEntityResolutionToCaptureFields,
  mergeResolutionIntoFieldRows,
} from "@/lib/entity-resolution/server/apply-capture-resolution.server";
import { inferCaptureSchedaTipo } from "@/lib/document-capture/capture-field-mapper";
import { upsertCaptureSignatureFields } from "@/lib/document-capture/upsert-capture-signature-fields.server";
import { parsePhysicalPages } from "@/lib/document-capture/physical/physical-parser";
import { normalizeCaptureExtractedFieldKey } from "@/lib/document-capture/capture-field-key-aliases";
import { projectDocumentModelToFlatFields } from "@/lib/document-capture/projection/document-model-flat-projection";
import {
  ensureSchedaOfficinaPluginRegistered,
  runSchedaPipelineViews,
} from "@/lib/document-capture/registry/scheda-officina-plugin";
import { schedaOfficinaPromptContract } from "@/lib/document-capture/registry/prompt-contract";
import { isDocumentCaptureHybridExtractionEnabled } from "@/lib/document-capture/document-capture-hybrid.server";
import {
  captureResultToHybridFields,
  hybridFieldsToCaptureExtraction,
  mergeWithGeminiFields,
} from "@/lib/document-capture/extraction/hybrid-extraction-merge";
import { runHybridExtractionWithTimeout } from "@/lib/document-capture/extraction/run-hybrid-extraction.server";
import { SCHEDA_OFFICINA_EXTRACTION_USER } from "@/lib/document-capture/scheda-officina-extraction-prompt";
import { classifyStorageDownloadError } from "@/lib/storage/storage-download-errors";
import { resolveGeminiAnalyzeRetryDelayMs } from "@/lib/ai/gemini-retry-after";
import { isGeminiAuthError, isGeminiUnreachableError } from "@/lib/ai/gemini-api-keys";
import { GEMINI_AUTH_ERROR_HINT } from "@/lib/ai/gemini-client";
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
      fieldCount: number;
    }
  | { ok: false; code: "not_configured" | "auth_invalid" | "unreachable" | "not_finalized" | "failed" | "no_fields"; message: string; errorType?: GeminiErrorType };

async function countCaptureFields(captureId: string): Promise<number> {
  const sb = await createSupabaseServerUserClient();
  const { count } = await sb
    .from("document_capture_fields")
    .select("id", { count: "exact", head: true })
    .eq("document_capture_id", captureId);
  return count ?? 0;
}

function legacyToExtractionResult(
  attemptId: string,
  legacy: CaptureExtractionResult,
  meta: ExtractionResult["modelMetadata"],
): ExtractionResult {
  const fields = listCaptureExtractionFields(legacy.fields).map((field, idx) => ({
    key: field.key,
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
  const configGate = resolveGeminiConfigurationGate();
  const geminiReady = configGate == null;
  const hybridEnabled = isDocumentCaptureHybridExtractionEnabled();

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
    const fieldCount = await countCaptureFields(captureId);
    if (fieldCount > 0) {
      const doc = await sb
        .from("document_capture")
        .select("document_model")
        .eq("id", captureId)
        .maybeSingle();
      const hash =
        (doc.data?.document_model as { metadata?: { contentHash?: string } } | null)?.metadata?.contentHash ?? "";
      return {
        ok: true,
        attemptId: existing.resultRef,
        durationMs: 0,
        reused: true,
        documentModelVersionHash: hash,
        fieldCount,
      };
    }
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
  const mime = normalizeCaptureMime({
    mime: capture.mime ?? fileData.type,
    fileName: capture.storage_path.split("/").pop(),
    bytes,
  });
  const plugin = ensureSchedaOfficinaPluginRegistered();
  const t0 = performance.now();

  let pipelineState = markUploadUploaded((await loadPipelineState(captureId)) ?? { ...INITIAL_PIPELINE_STATE });

  let pageObjects: Awaited<ReturnType<typeof parsePhysicalPages>>;
  try {
    pageObjects = await parsePhysicalPages(bytes, mime);
    tracePipelinePhase({ captureId, phase: "physical_parse", outcome: "ok" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parsing file non riuscito";
    await mutateCaptureWithEvent({
      captureId,
      eventType: "analyze_failed",
      idempotencyKey: `analyze_failed:parse:${capture.capture_version}`,
      payload: { errorCode: "physical_parse_failed", mime },
      newStatus: "failed",
    });
    return { ok: false, code: "failed", message };
  }

  const hybridResult = hybridEnabled
    ? await runHybridExtractionWithTimeout({ bytes, mime, pageObjects })
    : null;

  if (!geminiReady && (!hybridResult || hybridResult.mergedPrefill.length === 0)) {
    return {
      ok: false,
      code: "not_configured",
      errorType: configGate?.errorType ?? "CONFIG_NOT_FOUND",
      message: configGate?.message ?? GEMINI_NOT_CONFIGURED_MESSAGE,
    };
  }

  let lastError: unknown;
  let attemptId = "";
  let usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;
  let geminiUsed = false;
  let hybridMetadata: Record<string, unknown> | undefined;

  for (let retryAttempt = 0; retryAttempt <= RETRY_BACKOFF_MS.length; retryAttempt += 1) {
    try {
      let object: CaptureExtractionResult;

      if (hybridResult && !hybridResult.needsGemini && hybridResult.mergedPrefill.length > 0) {
        object = hybridFieldsToCaptureExtraction(hybridResult.mergedPrefill, hybridResult.schedaTipo);
        hybridMetadata = {
          hybrid: {
            geminiUsed: false,
            schedaTipoDetected: hybridResult.schedaTipo,
            pdfTextFieldCount: hybridResult.pdfTextFields.length,
            templateOcrFieldCount: hybridResult.templateOcrFields.length,
          },
        };
      } else if (geminiReady) {
        geminiUsed = true;
        const userPrompt =
          hybridResult?.geminiUserPrompt ??
          schedaOfficinaPromptContract.userPromptTemplate ??
          SCHEDA_OFFICINA_EXTRACTION_USER;
        const { object: geminiObject, usage: u, response } = await generateObjectWithGeminiFailover({
          schema: captureExtractionSchema,
          system: schedaOfficinaPromptContract.systemPrompt,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                buildGeminiCaptureDocumentPart(bytes, mime),
              ],
            },
          ],
          temperature: 0.2,
          abortSignal: AbortSignal.timeout(GEMINI_FILE_ANALYSIS_TIMEOUT_MS),
        });
        usage = u;
        const geminiExtraction = geminiObject as CaptureExtractionResult;
        const geminiFields = captureResultToHybridFields(listCaptureExtractionFields(geminiExtraction.fields));
        const merged = mergeWithGeminiFields(hybridResult?.mergedPrefill ?? [], geminiFields);
        object = hybridFieldsToCaptureExtraction(merged, geminiExtraction.schedaTipo ?? hybridResult?.schedaTipo ?? null);
        if (geminiExtraction.schedaTipo) object.schedaTipo = geminiExtraction.schedaTipo;
        if (geminiExtraction.warnings?.length) object.warnings = geminiExtraction.warnings;
        hybridMetadata = {
          hybrid: {
            geminiUsed: true,
            schedaTipoDetected: hybridResult?.schedaTipo ?? geminiExtraction.schedaTipo ?? null,
            pdfTextFieldCount: hybridResult?.pdfTextFields.length ?? 0,
            templateOcrFieldCount: hybridResult?.templateOcrFields.length ?? 0,
            prefillFieldCount: hybridResult?.mergedPrefill.length ?? 0,
          },
          providerRequestId:
            response && typeof response === "object" && "id" in response
              ? String((response as { id?: string }).id ?? "")
              : null,
        };
      } else if (hybridResult && hybridResult.mergedPrefill.length > 0) {
        object = hybridFieldsToCaptureExtraction(hybridResult.mergedPrefill, hybridResult.schedaTipo);
        hybridMetadata = {
          hybrid: {
            geminiUsed: false,
            schedaTipoDetected: hybridResult.schedaTipo,
            pdfTextFieldCount: hybridResult.pdfTextFields.length,
            templateOcrFieldCount: hybridResult.templateOcrFields.length,
          },
        };
      } else {
        return { ok: false, code: "no_fields", message: "Nessun dato letto dalla scheda. Verifica che foto o PDF siano nitidi e riprova." };
      }

      const { count } = await sb
        .from("document_capture_attempts")
        .select("id", { count: "exact", head: true })
        .eq("document_capture_id", captureId);
      const attemptNumber = (count ?? 0) + 1;
      const providerRequestId =
        hybridMetadata && "providerRequestId" in hybridMetadata
          ? String(hybridMetadata.providerRequestId ?? "")
          : null;

      const durationMs = Math.round(performance.now() - t0);
      const extractionResult = legacyToExtractionResult("pending", object, {
        modelId: geminiUsed ? "gemini" : "hybrid",
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

      const { data: attemptRow, error: insError } = await sb
        .from("document_capture_attempts")
        .insert({
          company_id: capture.company_id,
          document_capture_id: captureId,
          attempt_number: attemptNumber,
          provider: geminiUsed ? "google" : "hybrid",
          model: geminiUsed ? "gemini" : "tesseract+pdfjs",
          structured_response: object,
          extraction_result: { ...extractionResult, attemptId: "pending" },
          prompt_contract_id: schedaOfficinaPromptContract.id,
          prompt_version: schedaOfficinaPromptContract.version,
          metadata: { ...extractionResult.modelMetadata, ...hybridMetadata },
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

      if (insError || !attemptRow) throw new Error(insError?.message ?? "Salvataggio attempt fallito.");
      attemptId = attemptRow.id;
      extractionResult.attemptId = attemptId;

      const flatFields = projectDocumentModelToFlatFields(document);
      let fieldRows = flatFields.map((f) => ({
        company_id: capture.company_id,
        document_capture_id: captureId,
        attempt_id: attemptId,
        field_key: normalizeCaptureExtractedFieldKey(f.fieldKey),
        raw_value: f.value,
        normalized_value: f.value,
        confidence: f.confidence,
        value_source: "ai" as const,
      }));
      let resolutionAudit: Awaited<ReturnType<typeof applyEntityResolutionToCaptureFields>>["audit"] | undefined;
      if (fieldRows.length > 0) {
        const resolution = await applyEntityResolutionToCaptureFields(sb, {
          companyId: capture.company_id,
          captureId,
          fields: fieldRows.map((f) => ({ field_key: f.field_key, raw_value: f.raw_value })),
        });
        resolutionAudit = resolution.audit;
        fieldRows = mergeResolutionIntoFieldRows(fieldRows, resolution);
        await sb.from("document_capture_fields").upsert(fieldRows, {
          onConflict: "document_capture_id,field_key",
        });
      }

      const schedaTipo = object.schedaTipo ?? inferCaptureSchedaTipo(fieldRows) ?? null;
      const signatureRows = await upsertCaptureSignatureFields(sb, {
        companyId: capture.company_id,
        captureId,
        attemptId,
        bytes,
        mime,
        schedaTipo,
        existingFieldKeys: fieldRows.map((f) => f.field_key),
      });
      if (signatureRows.length > 0) {
        fieldRows = [...fieldRows, ...signatureRows];
      }

      pipelineState = advancePipelineStateForPhase(pipelineState, "ai_extract", true);
      pipelineState = advancePipelineStateForPhase(pipelineState, "validate", validation.status !== "blocked");
      await saveDocumentModelAndPipelineState({ captureId, document, pipelineState });

      if (fieldRows.length === 0) {
        await mutateCaptureWithEvent({
          captureId,
          eventType: "analyze_failed",
          idempotencyKey: `analyze_failed:empty:${capture.capture_version}`,
          payload: { errorCode: "no_fields", pipeline: "v4.1" },
          newStatus: "failed",
        });
        return {
          ok: false,
          code: "no_fields",
          message: "Nessun dato letto dalla scheda. Verifica che foto o PDF siano nitidi e riprova.",
        };
      }

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
          entityResolution: resolutionAudit,
        },
        newStatus: "review",
      });

      return {
        ok: true,
        attemptId,
        durationMs,
        reused: false,
        documentModelVersionHash: document.metadata.contentHash,
        fieldCount: fieldRows.length,
      };
    } catch (e) {
      lastError = e;
      if (retryAttempt < RETRY_BACKOFF_MS.length) {
        await sleep(resolveGeminiAnalyzeRetryDelayMs(e, retryAttempt, RETRY_BACKOFF_MS));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Analisi non riuscita.";
  const code = isGeminiAuthError(lastError)
    ? "auth_invalid"
    : isGeminiUnreachableError(lastError)
      ? "unreachable"
      : "failed";
  const userMessage =
    code === "auth_invalid"
      ? GEMINI_AUTH_ERROR_HINT
      : code === "unreachable"
        ? "Chiave presente ma API Gemini non raggiungibile. Riprova tra poco."
        : message;
  await mutateCaptureWithEvent({
    captureId,
    eventType: "analyze_failed",
    idempotencyKey: `analyze_failed:${capture.capture_version}`,
    payload: { errorCode: code, message: userMessage, pipeline: "v4.1" },
    newStatus: "failed",
  });
  return { ok: false, code, message: userMessage };
}
