import "server-only";

import { aiService } from "@/lib/ai/runtime/service";
import {
  mapAiErrorToAnalyzeCode,
  mapAiErrorToLegacyErrorType,
  userMessageForAiError,
} from "@/lib/ai/runtime/map-ai-error";
import type { AiErrorCode } from "@/lib/ai/runtime/types";
import { validateRuntimePrerequisites } from "@/lib/ai/runtime/validate-runtime-prerequisites";
import {
  CaptureAnalyzeError,
  CompileAnalyzeError,
  errorDetailFromUnknown,
  GeminiAnalyzeError,
  isCaptureAnalyzeError,
  PrerequisitesAnalyzeError,
  ValidationAnalyzeError,
} from "@/lib/document-capture/analyze-errors";
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
import {
  buildPipelineIdempotencySuffix,
  CAPTURE_PIPELINE_VERSION,
} from "@/lib/document-capture/orchestrator/capture-pipeline-version";
import { normalizeCaptureMime } from "@/lib/document-capture/capture-mime";
import {
  fetchCaptureMagazzinoCatalog,
  fetchCaptureMezziCatalog,
} from "@/lib/document-capture/capture-intervento-write-deps.server";
import {
  applyEntityResolutionToCaptureFields,
  mergeResolutionIntoFieldRows,
} from "@/lib/entity-resolution/server/apply-capture-resolution.server";
import { loadResolutionRuntimeContext } from "@/lib/entity-resolution/server/load-resolution-context.server";
import { inferCaptureSchedaTipo } from "@/lib/document-capture/capture-field-mapper";
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
import type { HybridExtractionResult } from "@/lib/document-capture/extraction/hybrid-extraction-types";
import { SCHEDA_OFFICINA_EXTRACTION_USER } from "@/lib/document-capture/scheda-officina-extraction-prompt";
import { classifyStorageDownloadError } from "@/lib/storage/storage-download-errors";
import { resolveGeminiAnalyzeRetryDelayMs } from "@/lib/ai/gemini-retry-after";
import { classifyAiError, logUnclassifiedAiError } from "@/lib/ai/runtime/errors";
import { isTransientAnalyzeRetryError } from "@/lib/ai/gemini-analyze-retry-policy";
import { createAnalyzeTrace, type AnalyzeTrace, type AnalyzeTraceListener } from "@/lib/document-capture/pipeline/analyze-trace.server";
import { AnalyzeTimeoutBudget } from "@/lib/document-capture/pipeline/analyze-timeout-budget";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

const RETRY_BACKOFF_MS = [1_000, 3_000] as const;
const HYBRID_MAX_MS = 35_000;

export type AnalyzeCaptureV41Result =
  | {
      ok: true;
      attemptId: string;
      durationMs: number;
      reused: boolean;
      documentModelVersionHash: string;
      fieldCount: number;
      traceId: string;
    }
  | {
      ok: false;
      code: "not_configured" | "auth_invalid" | "unreachable" | "not_finalized" | "failed" | "no_fields";
      message: string;
      errorType?: string;
      phase?: string;
      detail?: string;
      traceId?: string;
      correlationId?: string;
    };

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

function buildAnalyzeFailure(input: {
  code: Extract<AnalyzeCaptureV41Result, { ok: false }>["code"];
  aiCode?: AiErrorCode;
  errorType?: string;
  message: string;
  detail: string;
  phase?: string;
  traceId?: string;
  correlationId?: string;
}): Extract<AnalyzeCaptureV41Result, { ok: false }> {
  return {
    ok: false,
    code: input.code,
    message: input.message,
    errorType: input.errorType ?? (input.aiCode ? mapAiErrorToLegacyErrorType(input.aiCode) : undefined),
    phase: input.phase,
    detail: input.detail,
    traceId: input.traceId,
    correlationId: input.correlationId,
  };
}

export type AnalyzeDocumentCaptureV41Options = {
  correlationId?: string;
  bytes?: Uint8Array;
  mime?: string;
  onPhase?: AnalyzeTraceListener;
  trace?: AnalyzeTrace;
};

export async function analyzeDocumentCaptureV41(
  captureId: string,
  userId: string,
  options?: AnalyzeDocumentCaptureV41Options,
): Promise<AnalyzeCaptureV41Result> {
  const correlationId = options?.correlationId;
  const trace =
    options?.trace ??
    createAnalyzeTrace({
      captureId,
      correlationId,
      companyId: null,
      pipelineVersion: CAPTURE_PIPELINE_VERSION,
      onPhase: options?.onPhase,
    });
  if (!options?.trace) {
    trace.emit("START", "ok");
  }

  const budget = new AnalyzeTimeoutBudget();
  const hybridEnabled = isDocumentCaptureHybridExtractionEnabled();

  const sb = await createSupabaseServerUserClient();
  const { data: capture, error } = await sb
    .from("document_capture")
    .select("id, company_id, storage_path, finalized_at, mime, capture_version, status")
    .eq("id", captureId)
    .maybeSingle();

  if (error || !capture?.finalized_at) {
    trace.emit("END_FAIL", "fail", { errorCode: "not_finalized", detail: "Documento non finalizzato." });
    return { ok: false, code: "not_finalized", message: "Documento non finalizzato.", traceId: trace.traceId };
  }

  const idempotencyKey = buildPipelineIdempotencyKey(
    "ai_extract",
    captureId,
    buildPipelineIdempotencySuffix({
      pipelineVersion: CAPTURE_PIPELINE_VERSION,
      captureVersion: capture.capture_version,
    }),
  );
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
      trace.emit("END_OK", "ok", { fieldCount, detail: "reused_pipeline_execution" });
      return {
        ok: true,
        attemptId: existing.resultRef,
        durationMs: 0,
        reused: true,
        documentModelVersionHash: hash,
        fieldCount,
        traceId: trace.traceId,
      };
    }
  }

  trace.emit("PREREQUISITES_START", "ok", { companyId: capture.company_id });
  let prereq: Awaited<ReturnType<typeof validateRuntimePrerequisites>> | null = null;
  const prereqPromise = validateRuntimePrerequisites({ requireGemini: true, requireOcr: false })
    .then((value) => {
      prereq = value;
      trace.setProviderMeta({
        providerModel: value.modelId,
        providerKeyId: value.keyId,
        providerKeySlot: value.keySlot,
      });
      if (value.ocrWarning) {
        trace.emit("HYBRID_SKIP", "skip", { detail: value.ocrWarning });
      }
      trace.emit("PREREQUISITES_OK", "ok", {
        providerModel: value.modelId,
        providerKeyId: value.keyId,
        providerKeySlot: value.keySlot,
      });
      return value;
    })
    .catch((e) => {
      if (e instanceof PrerequisitesAnalyzeError) {
        trace.fail("PREREQUISITES_FAIL", e);
        trace.emit("END_FAIL", "fail", { errorCode: "not_configured", detail: e.detail });
        throw e;
      }
      throw e;
    });

  let bytes = options?.bytes;
  let mime = options?.mime;

  if (!bytes) {
    trace.emit("DOWNLOAD_STORAGE_START", "ok", {
      storagePath: capture.storage_path,
      companyId: capture.company_id,
    });
    const downloadPromise = sb.storage.from(STORAGE_BUCKETS.documentCapture).download(capture.storage_path);
    try {
      const [, fileResult] = await Promise.all([prereqPromise, downloadPromise]);
      const { data: fileData, error: dlError } = fileResult;
      if (dlError || !fileData) {
        const classified = classifyStorageDownloadError(
          dlError,
          Boolean(fileData),
          STORAGE_BUCKETS.documentCapture,
          "analisi documento",
        );
        trace.fail("DOWNLOAD_STORAGE_FAIL", dlError ?? new Error(classified.message), {
          errorCode: classified.code,
          storagePath: capture.storage_path,
        });
        await mutateCaptureWithEvent({
          captureId,
          eventType: "analyze_failed",
          idempotencyKey: `analyze_failed:download:${capture.capture_version}`,
          payload: {
            errorCode: classified.code,
            traceId: trace.traceId,
            detail: classified.message,
            phase: "DOWNLOAD_STORAGE_FAIL",
          },
          newStatus: "failed",
        });
        trace.emit("END_FAIL", "fail", { errorCode: classified.code });
        return buildAnalyzeFailure({
          code: "failed",
          aiCode: "AI_STORAGE_ERROR",
          message: classified.message,
          detail: classified.message,
          phase: "DOWNLOAD_STORAGE_FAIL",
          traceId: trace.traceId,
          correlationId,
        });
      }
      bytes = new Uint8Array(await fileData.arrayBuffer());
      mime = normalizeCaptureMime({
        mime: capture.mime ?? fileData.type,
        fileName: capture.storage_path.split("/").pop(),
        bytes,
      });
      trace.emit("DOWNLOAD_STORAGE_OK", "ok", {
        fileMime: mime,
        fileSize: bytes.byteLength,
        storagePath: capture.storage_path,
      });
    } catch (e) {
      if (e instanceof PrerequisitesAnalyzeError) {
        return buildAnalyzeFailure({
          code: "not_configured",
          aiCode: "AI_CONFIG_MISSING",
          errorType: "AI_CONFIG_MISSING",
          message: e.userMessage,
          detail: e.detail,
          phase: e.phase,
          traceId: trace.traceId,
          correlationId,
        });
      }
      throw e;
    }
  } else {
    try {
      await prereqPromise;
      mime =
        mime ??
        normalizeCaptureMime({
          mime: capture.mime ?? "application/octet-stream",
          fileName: capture.storage_path.split("/").pop(),
          bytes,
        });
      if (!options?.trace) {
        trace.emit("DOWNLOAD_STORAGE_OK", "ok", {
          fileMime: mime,
          fileSize: bytes.byteLength,
          storagePath: capture.storage_path,
          detail: "bytes_provided",
        });
      }
    } catch (e) {
      if (e instanceof PrerequisitesAnalyzeError) {
        return buildAnalyzeFailure({
          code: "not_configured",
          aiCode: "AI_CONFIG_MISSING",
          errorType: "AI_CONFIG_MISSING",
          message: e.userMessage,
          detail: e.detail,
          phase: e.phase,
          traceId: trace.traceId,
          correlationId,
        });
      }
      throw e;
    }
  }

  const geminiReady = Boolean(prereq);
  if (!prereq) {
    try {
      prereq = await prereqPromise;
    } catch {
      // handled by geminiReady guard below
    }
  }

  await mutateCaptureWithEvent({
    captureId,
    eventType: "analyze_started",
    idempotencyKey: `analyze_started:${capture.capture_version}`,
    payload: { captureVersion: capture.capture_version, pipeline: "v4.1", traceId: trace.traceId },
    newStatus: "analyzing",
  });

  const plugin = ensureSchedaOfficinaPluginRegistered();
  const t0 = performance.now();

  let pipelineState = markUploadUploaded({ ...INITIAL_PIPELINE_STATE });

  trace.emit("PARSE_START", "ok", { fileMime: mime });
  let pageObjects: Awaited<ReturnType<typeof parsePhysicalPages>>;
  try {
    pageObjects = await parsePhysicalPages(bytes, mime);
  } catch (e) {
    const detail = errorDetailFromUnknown(e);
    trace.fail("PARSE_FAIL", e, { fileMime: mime });
    await mutateCaptureWithEvent({
      captureId,
      eventType: "analyze_failed",
      idempotencyKey: `analyze_failed:parse:${capture.capture_version}`,
      payload: { errorCode: "physical_parse_failed", mime, traceId: trace.traceId, detail, phase: "PARSE_FAIL" },
      newStatus: "failed",
    });
    trace.emit("END_FAIL", "fail", { errorCode: "physical_parse_failed" });
    return buildAnalyzeFailure({
      code: "failed",
      message: detail,
      detail,
      phase: "PARSE_FAIL",
      traceId: trace.traceId,
      correlationId,
    });
  }
  trace.emit("PARSE_OK", "ok", { fileMime: mime });

  trace.emit("PRELOAD_START", "ok");
  const preloadPromise = (async () => {
    const [magazzino, mezzi, loadedPipelineState] = await Promise.all([
      fetchCaptureMagazzinoCatalog(),
      fetchCaptureMezziCatalog(),
      loadPipelineState(captureId),
    ]);
    const resolutionContext = await loadResolutionRuntimeContext(sb, capture.company_id, {
      magazzino,
      mezzi,
    });
    trace.emit("PRELOAD_OK", "ok");
    return { magazzino, mezzi, resolutionContext, pipelineState: loadedPipelineState };
  })();

  let hybridResult: HybridExtractionResult | null = null;

  if (hybridEnabled) {
    trace.emit("HYBRID_START", "ok");
    budget.assertRemaining("hybrid");
    const hybridMs = budget.allocate("hybrid", HYBRID_MAX_MS);
    const hybridRun = await runHybridExtractionWithTimeout({
      bytes,
      mime,
      pageObjects,
      timeoutMs: hybridMs,
      trace,
    });
    if (hybridRun.status === "ok") {
      hybridResult = hybridRun.data;
      trace.emit("HYBRID_OK", "ok", {
        fieldCount: hybridRun.data.mergedPrefill.length,
        detail: hybridRun.data.needsGemini ? "needs_gemini" : "prefill_sufficient",
      });
    } else if (hybridRun.status === "skip") {
      trace.emit("HYBRID_SKIP", "skip", { detail: hybridRun.reason });
    } else {
      trace.emit("HYBRID_FAIL", "fail", { detail: hybridRun.error });
    }
  } else {
    trace.emit("HYBRID_SKIP", "skip", { detail: "hybrid_disabled" });
  }

  if (!geminiReady && (!hybridResult || hybridResult.mergedPrefill.length === 0)) {
    trace.emit("END_FAIL", "fail", { errorCode: "AI_CONFIG_MISSING" });
    return buildAnalyzeFailure({
      code: "not_configured",
      aiCode: "AI_CONFIG_MISSING",
      errorType: "AI_CONFIG_MISSING",
      message: userMessageForAiError("AI_CONFIG_MISSING"),
      detail: "Gemini non configurato e hybrid senza prefill",
      phase: "PREREQUISITES_FAIL",
      traceId: trace.traceId,
      correlationId,
    });
  }

  let lastError: unknown;
  let attemptId = "";
  let usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;
  let geminiUsed = false;
  let hybridMetadata: Record<string, unknown> | undefined;
  const retryCount = RETRY_BACKOFF_MS.length;

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
      } else if (prereq) {
        geminiUsed = true;
        trace.setRetry(retryAttempt, retryCount);
        const userPrompt =
          hybridResult?.geminiUserPrompt ??
          schedaOfficinaPromptContract.userPromptTemplate ??
          SCHEDA_OFFICINA_EXTRACTION_USER;
        const documentPart = buildGeminiCaptureDocumentPart(bytes, mime);
        trace.emit("GEMINI_PAYLOAD_OK", "ok", { fileSize: bytes.byteLength, fileMime: mime });
        trace.emit("GEMINI_REQUEST", "ok", {
          retryAttempt,
          providerModel: prereq.modelId,
          providerKeyId: prereq.keyId,
          providerKeySlot: prereq.keySlot,
        });

        budget.assertRemaining("gemini");
        const geminiTimeoutMs = budget.allocate("gemini", budget.remainingMs());

        const aiResult = await aiService.analyzeDocument<CaptureExtractionResult>({
          schema: captureExtractionSchema,
          system: schedaOfficinaPromptContract.systemPrompt,
          userContent: [
            {
              role: "user",
              content: [{ type: "text", text: userPrompt }, documentPart],
            },
          ],
          temperature: 0.2,
          timeoutMs: geminiTimeoutMs,
        });
        if (!aiResult.ok) {
          throw new GeminiAnalyzeError(aiResult.code, aiResult.message);
        }

        const parsed = captureExtractionSchema.safeParse(aiResult.data.object);
        if (!parsed.success) {
          throw new ValidationAnalyzeError(parsed.error.message);
        }

        const geminiObject = parsed.data;
        usage = aiResult.data.usage;
        const response = aiResult.data.response;
        trace.emit("GEMINI_RESPONSE", "ok", {
          retryAttempt,
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
          totalTokens: usage?.totalTokens,
        });

        const geminiFields = captureResultToHybridFields(listCaptureExtractionFields(geminiObject.fields));
        const merged = mergeWithGeminiFields(hybridResult?.mergedPrefill ?? [], geminiFields);
        object = hybridFieldsToCaptureExtraction(merged, geminiObject.schedaTipo ?? hybridResult?.schedaTipo ?? null);
        if (geminiObject.schedaTipo) object.schedaTipo = geminiObject.schedaTipo;
        if (geminiObject.warnings?.length) object.warnings = geminiObject.warnings;
        hybridMetadata = {
          hybrid: {
            geminiUsed: true,
            schedaTipoDetected: hybridResult?.schedaTipo ?? geminiObject.schedaTipo ?? null,
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
        trace.emit("END_FAIL", "fail", { errorCode: "no_fields" });
        return {
          ok: false,
          code: "no_fields",
          message: "Nessun dato letto dalla scheda. Verifica che foto o PDF siano nitidi e riprova.",
          traceId: trace.traceId,
          correlationId,
        };
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
        modelId: geminiUsed ? prereq?.modelId ?? "gemini" : "hybrid",
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
      const flatFields = projectDocumentModelToFlatFields(document);
      const baseFieldRows = flatFields.map((f) => ({
        company_id: capture.company_id,
        document_capture_id: captureId,
        field_key: normalizeCaptureExtractedFieldKey(f.fieldKey),
        raw_value: f.value,
        normalized_value: f.value,
        confidence: f.confidence,
        value_source: "ai" as const,
      }));

      const [{ validation }, preload, resolution] = await Promise.all([
        Promise.resolve(runSchedaPipelineViews(document)),
        preloadPromise,
        baseFieldRows.length > 0
          ? preloadPromise.then(({ magazzino, mezzi, resolutionContext }) => {
              trace.emit("ENTITY_RESOLUTION_START", "ok");
              return applyEntityResolutionToCaptureFields(sb, {
                companyId: capture.company_id,
                captureId,
                fields: baseFieldRows.map((f) => ({ field_key: f.field_key, raw_value: f.raw_value })),
                magazzino,
                mezzi,
                resolutionContext,
              }).then((result) => {
                trace.emit("ENTITY_RESOLUTION_OK", "ok", { fieldCount: result.fields.length });
                return result;
              });
            })
          : Promise.resolve(null),
      ]);

      pipelineState = markUploadUploaded(preload.pipelineState ?? { ...INITIAL_PIPELINE_STATE });

      trace.emit("DB_PERSIST_START", "ok");
      trace.emit("UPSERT_FIELDS_START", "ok");

      const { data: attemptRow, error: insError } = await sb
        .from("document_capture_attempts")
        .insert({
          company_id: capture.company_id,
          document_capture_id: captureId,
          attempt_number: attemptNumber,
          provider: geminiUsed ? "google" : "hybrid",
          model: geminiUsed ? prereq?.modelId ?? "gemini" : "tesseract+pdfjs",
          structured_response: object,
          extraction_result: { ...extractionResult, attemptId: "pending" },
          prompt_contract_id: schedaOfficinaPromptContract.id,
          prompt_version: schedaOfficinaPromptContract.version,
          metadata: { ...extractionResult.modelMetadata, ...hybridMetadata, traceId: trace.traceId },
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

      if (insError || !attemptRow) {
        throw new CompileAnalyzeError(insError?.message ?? "Salvataggio attempt fallito.");
      }
      attemptId = attemptRow.id;
      extractionResult.attemptId = attemptId;

      let fieldRows = baseFieldRows.map((f) => ({
        ...f,
        attempt_id: attemptId,
      }));
      let resolutionAudit = resolution?.audit;
      if (resolution) {
        fieldRows = mergeResolutionIntoFieldRows(fieldRows, resolution);
        const { error: upsertError } = await sb.from("document_capture_fields").upsert(fieldRows, {
          onConflict: "document_capture_id,field_key",
        });
        if (upsertError) {
          throw new CompileAnalyzeError(upsertError.message);
        }
      }

      const schedaTipo = object.schedaTipo ?? inferCaptureSchedaTipo(fieldRows) ?? null;

      pipelineState = advancePipelineStateForPhase(pipelineState, "ai_extract", true);
      pipelineState = advancePipelineStateForPhase(pipelineState, "validate", validation.status !== "blocked");
      await saveDocumentModelAndPipelineState({ captureId, document, pipelineState });
      trace.emit("DB_PERSIST_OK", "ok");

      if (fieldRows.length === 0) {
        trace.emit("UPSERT_FIELDS_FAIL", "fail", { errorCode: "no_fields" });
        await mutateCaptureWithEvent({
          captureId,
          eventType: "analyze_failed",
          idempotencyKey: `analyze_failed:empty:${capture.capture_version}`,
          payload: { errorCode: "no_fields", pipeline: "v4.1", traceId: trace.traceId },
          newStatus: "failed",
        });
        trace.emit("END_FAIL", "fail", { errorCode: "no_fields" });
        return {
          ok: false,
          code: "no_fields",
          message: "Nessun dato letto dalla scheda. Verifica che foto o PDF siano nitidi e riprova.",
          traceId: trace.traceId,
          correlationId,
        };
      }

      trace.emit("UPSERT_FIELDS_OK", "ok", { fieldCount: fieldRows.length });

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
          traceId: trace.traceId,
        },
        newStatus: "review",
      });

      trace.emit("END_OK", "ok", { fieldCount: fieldRows.length, durationMs });

      return {
        ok: true,
        attemptId,
        durationMs,
        reused: false,
        documentModelVersionHash: document.metadata.contentHash,
        fieldCount: fieldRows.length,
        traceId: trace.traceId,
      };
    } catch (e) {
      lastError = e;
      if (isCaptureAnalyzeError(e)) {
        trace.fail(e.phase, e, { errorCode: e.code });
      } else if (geminiUsed) {
        trace.fail("GEMINI_FAIL", e, { retryAttempt });
      }
      if (retryAttempt < RETRY_BACKOFF_MS.length && isTransientAnalyzeRetryError(e)) {
        await sleep(resolveGeminiAnalyzeRetryDelayMs(e, retryAttempt, RETRY_BACKOFF_MS));
      } else {
        break;
      }
    }
  }

  const detail = errorDetailFromUnknown(lastError);
  const aiCode = isCaptureAnalyzeError(lastError)
    ? (lastError.code as AiErrorCode)
    : classifyAiError(lastError);
  if (aiCode === "AI_UNKNOWN_ERROR") {
    logUnclassifiedAiError(lastError, { captureId, traceId: trace.traceId, correlationId: correlationId ?? null });
  }
  const code = mapAiErrorToAnalyzeCode(aiCode);
  const userMessage = isCaptureAnalyzeError(lastError) ? lastError.userMessage : userMessageForAiError(aiCode);
  const phase = isCaptureAnalyzeError(lastError) ? lastError.phase : trace.lastRecordedPhase();

  await mutateCaptureWithEvent({
    captureId,
    eventType: "analyze_failed",
    idempotencyKey: `analyze_failed:${capture.capture_version}`,
    payload: {
      errorCode: code,
      errorType: aiCode,
      message: userMessage,
      detail,
      phase,
      traceId: trace.traceId,
      pipeline: "v4.1",
      stack: lastError instanceof Error ? lastError.stack?.slice(0, 800) : undefined,
    },
    newStatus: "failed",
  });
  trace.emit("END_FAIL", "fail", { errorCode: code, errorType: aiCode, detail });

  return buildAnalyzeFailure({
    code,
    aiCode,
    errorType: aiCode,
    message: userMessage,
    detail,
    phase,
    traceId: trace.traceId,
    correlationId,
  });
}
