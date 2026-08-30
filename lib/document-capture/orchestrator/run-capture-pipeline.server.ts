import "server-only";

import {
  analyzeDocumentCaptureV41,
  type AnalyzeCaptureV41Result,
} from "@/lib/document-capture/pipeline/analyze-capture-v41.server";
import { createAnalyzeStreamListener } from "@/lib/document-capture/pipeline/analyze-stream-writer.server";
import type { CaptureAnalyzeStreamEvent } from "@/lib/document-capture/pipeline/analyze-stream-events";
import { createAnalyzeTrace } from "@/lib/document-capture/pipeline/analyze-trace.server";
import {
  finalizeCaptureFromBytes,
  type FinalizeCaptureResult,
} from "@/lib/document-capture/finalize-transaction.server";
import { normalizeCaptureMime } from "@/lib/document-capture/capture-mime";
import { classifyStorageDownloadError } from "@/lib/storage/storage-download-errors";
import { STORAGE_BUCKETS } from "@/src/lib/storage/storage-config";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import {
  CAPTURE_PIPELINE_VERSION,
  buildPipelineIdempotencySuffix,
} from "@/lib/document-capture/orchestrator/capture-pipeline-version";
import type {
  CapturePipelineExecutionContext,
  CapturePipelineTerminalState,
} from "@/lib/document-capture/orchestrator/pipeline-types";
import { createPipelineWatchdog } from "@/lib/document-capture/orchestrator/pipeline-watchdog";
import {
  nextPipelineRequestSeq,
  traceCapturePipelineEvent,
} from "@/lib/document-capture/orchestrator/pipeline-telemetry.server";
import { buildCapturePipelineError } from "@/lib/document-capture/capture-pipeline-error";
import {

  runPipelinePhase,
  type PipelineOrchestratorDeps,
} from "@/lib/document-capture/orchestrator/pipeline-orchestrator";
import {
  findPipelineExecution,
  savePipelineExecution,
} from "@/lib/document-capture/orchestrator/pipeline-execution-store.server";
import { loadPipelineState, savePipelineState } from "@/lib/document-capture/document-model-service.server";
import { INITIAL_PIPELINE_STATE } from "@/lib/document-capture/model/pipeline-state";
import { markUploadUploaded } from "@/lib/document-capture/orchestrator/pipeline-state-advance";

export type RunCapturePipelineResult =
  | (AnalyzeCaptureV41Result & { finalize: FinalizeCaptureResult; executionId: string; pipelineVersion: string })
  | {
      ok: false;
      code: string;
      message: string;
      executionId: string;
      pipelineVersion: string;
      traceId?: string;
      correlationId?: string;
      terminalState: CapturePipelineTerminalState;
      finalize?: FinalizeCaptureResult;
    };

type ServerInFlightEntry = {
  executionId: string;
  pipelineVersion: string;
  startedAt: number;
};

const serverInFlight = new Map<string, ServerInFlightEntry>();
const ANALYZE_IN_FLIGHT_MAX_MS = 5 * 60_000;

function emitTerminal(
  onStreamEvent: ((event: CaptureAnalyzeStreamEvent) => void) | undefined,
  ctx: CapturePipelineExecutionContext,
  terminalState: CapturePipelineTerminalState,
  extra?: { code?: string; message?: string },
): void {
  const elapsedMs = Math.round(performance.now() - ctx.startedAt);
  onStreamEvent?.({
    type: "terminal",
    terminalState,
    execution: {
      captureId: ctx.captureId,
      pipelineVersion: ctx.pipelineVersion,
      executionId: ctx.executionId,
      traceId: ctx.traceId,
      correlationId: ctx.correlationId,
    },
    code: extra?.code,
    message: extra?.message,
    elapsedMs,
  });
  traceCapturePipelineEvent({
    captureId: ctx.captureId,
    pipelineVersion: ctx.pipelineVersion,
    executionId: ctx.executionId,
    correlationId: ctx.correlationId,
    traceId: ctx.traceId,
    terminalState,
    elapsedMs,
    outcome: terminalState === "completed" ? "ok" : "error",
    errorCode: extra?.code,
    detail: extra?.message,
  });
}

function releaseInFlight(captureId: string, executionId: string): void {
  const current = serverInFlight.get(captureId);
  if (current?.executionId === executionId) serverInFlight.delete(captureId);
}

async function runVerifyPhase(
  ctx: CapturePipelineExecutionContext,
  uploadDurationMs: number | undefined,
  onStreamEvent: ((event: CaptureAnalyzeStreamEvent) => void) | undefined,
): Promise<
  | { ok: true; bytes: Uint8Array; mime: string; finalize: FinalizeCaptureResult; captureVersion: number }
  | { ok: false; code: string; message: string }
> {
  const sb = await createSupabaseServerUserClient();
  const stream = onStreamEvent ? createAnalyzeStreamListener(onStreamEvent) : null;
  const trace = createAnalyzeTrace({
    captureId: ctx.captureId,
    correlationId: ctx.correlationId,
    companyId: null,
    pipelineVersion: CAPTURE_PIPELINE_VERSION,
    onPhase: stream?.listener,
  });
  ctx.traceId = trace.traceId;

  trace.emit("START", "ok");
  if (uploadDurationMs != null) trace.emit("UPLOAD_OK", "ok", { durationMs: uploadDurationMs });

  const { data: capture, error } = await sb
    .from("document_capture")
    .select("id, company_id, storage_path, finalized_at, mime, status, capture_version")
    .eq("id", ctx.captureId)
    .maybeSingle();

  if (error || !capture?.storage_path) {
    trace.fail("DOWNLOAD_STORAGE_FAIL", error ?? new Error("Documento non disponibile"));
    stream?.stopHeartbeat();
    return { ok: false, code: "not_finalized", message: "Documento non disponibile." };
  }

  trace.emit("DOWNLOAD_STORAGE_START", "ok", {
    storagePath: capture.storage_path,
    companyId: capture.company_id,
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
    trace.fail("DOWNLOAD_STORAGE_FAIL", dlError ?? new Error(classified.message));
    stream?.stopHeartbeat();
    return { ok: false, code: "storage", message: classified.message };
  }

  let bytes = new Uint8Array(await fileData.arrayBuffer());
  const fileName = capture.storage_path.split("/").pop() ?? "document";
  let mime = normalizeCaptureMime({
    mime: capture.mime ?? fileData.type,
    fileName,
    bytes,
  });

  trace.emit("DOWNLOAD_STORAGE_OK", "ok", {
    fileMime: mime,
    fileSize: bytes.byteLength,
    storagePath: capture.storage_path,
  });

  let finalizeResult: FinalizeCaptureResult;
  if (!capture.finalized_at) {
    trace.emit("FINALIZE_START", "ok");
    const finalized = await finalizeCaptureFromBytes({
      captureId: ctx.captureId,
      storagePath: capture.storage_path,
      bytes,
      mime,
      fileName,
      reuploadConverted: true,
    });
    if ("ok" in finalized && finalized.ok === false) {
      trace.emit("FINALIZE_FAIL", "fail", { detail: finalized.message });
      stream?.stopHeartbeat();
      return { ok: false, code: "finalize_failed", message: finalized.message };
    }
    if ("result" in finalized) {
      finalizeResult = finalized.result;
      bytes = new Uint8Array(finalized.bytes);
      mime = finalized.mime;
      trace.emit("FINALIZE_OK", "ok", { fileMime: mime, fileSize: bytes.byteLength });
    } else {
      trace.emit("FINALIZE_FAIL", "fail", { detail: "Finalizzazione non completata." });
      stream?.stopHeartbeat();
      return { ok: false, code: "finalize_failed", message: "Finalizzazione non completata." };
    }
  } else {
    finalizeResult = { ok: true, id: capture.id, status: capture.status ?? undefined };
  }

  stream?.stopHeartbeat();
  return {
    ok: true,
    bytes,
    mime,
    finalize: finalizeResult,
    captureVersion: capture.capture_version ?? 0,
  };
}

function createOrchestratorDeps(executionId: string): PipelineOrchestratorDeps {
  return {
    getPipelineState: async (captureId) => (await loadPipelineState(captureId)) ?? INITIAL_PIPELINE_STATE,
    setPipelineState: async (captureId, state) => {
      await savePipelineState(captureId, state);
    },
    findExecution: findPipelineExecution,
    saveExecution: savePipelineExecution,
    runPhase: async () => ({ resultRef: executionId }),
  };
}

export async function runCapturePipeline(input: {
  captureId: string;
  userId: string;
  correlationId?: string;
  clientPipelineVersion?: string | null;
  onStreamEvent?: (event: CaptureAnalyzeStreamEvent) => void;
  uploadDurationMs?: number;
}): Promise<RunCapturePipelineResult> {
  const requestSeq = nextPipelineRequestSeq();
  const pipelineVersion = CAPTURE_PIPELINE_VERSION;
  const startedAt = performance.now();
  const executionId = crypto.randomUUID();

  const inMemory = serverInFlight.get(input.captureId);
  if (inMemory && Date.now() - inMemory.startedAt < ANALYZE_IN_FLIGHT_MAX_MS) {
    if (input.clientPipelineVersion && input.clientPipelineVersion !== inMemory.pipelineVersion) {
      serverInFlight.delete(input.captureId);
    } else {
      const err = buildCapturePipelineError({
        code: "ANALYZE_IN_PROGRESS",
        phase: "ai_extract",
        terminalState: "failed",
        message: "Analisi già in corso per questo documento.",
        captureId: input.captureId,
        pipelineVersion: inMemory.pipelineVersion,
        executionId: inMemory.executionId,
        correlationId: input.correlationId,
      });
      return {
        ok: false,
        code: err.code,
        message: err.message,
        executionId: inMemory.executionId,
        pipelineVersion: inMemory.pipelineVersion,
        terminalState: "failed",
        correlationId: input.correlationId,
      };
    }
  }

  const ctx: CapturePipelineExecutionContext = {
    captureId: input.captureId,
    pipelineVersion,
    executionId,
    correlationId: input.correlationId,
    traceId: "",
    userId: input.userId,
    startedAt,
  };

  serverInFlight.set(input.captureId, { executionId, pipelineVersion, startedAt });

  const watchdog = createPipelineWatchdog();
  let terminalEmitted = false;

  const ensureTerminal = (
    terminalState: CapturePipelineTerminalState,
    extra?: { code?: string; message?: string },
  ) => {
    if (terminalEmitted) return;
    terminalEmitted = true;
    emitTerminal(input.onStreamEvent, ctx, terminalState, extra);
  };

  traceCapturePipelineEvent({
    captureId: ctx.captureId,
    pipelineVersion,
    executionId,
    correlationId: input.correlationId,
    phase: "verify",
    elapsedMs: 0,
    requestSeq,
    outcome: "ok",
  });

  try {
    watchdog.touch("verify");
    const verifyTimeout = watchdog.check();
    if (verifyTimeout) {
      const err = buildCapturePipelineError({
        code: verifyTimeout,
        phase: "verify",
        terminalState: "failed",
        message: "Verifica documento scaduta.",
        captureId: ctx.captureId,
        pipelineVersion,
        executionId,
        correlationId: input.correlationId,
      });
      ensureTerminal("failed", { code: err.code, message: err.message });
      return {
        ok: false,
        code: err.code,
        message: err.message,
        executionId,
        pipelineVersion,
        terminalState: "failed",
        correlationId: input.correlationId,
      };
    }

    const verifyResult = await runVerifyPhase(ctx, input.uploadDurationMs, input.onStreamEvent);
    if (!verifyResult.ok) {
      ensureTerminal("failed", { code: verifyResult.code, message: verifyResult.message });
      return {
        ok: false,
        code: verifyResult.code,
        message: verifyResult.message,
        executionId,
        pipelineVersion,
        terminalState: "failed",
        correlationId: input.correlationId,
        traceId: ctx.traceId,
      };
    }

    const idempotencySuffix = buildPipelineIdempotencySuffix({
      pipelineVersion,
      captureVersion: verifyResult.captureVersion,
    });
    const deps = createOrchestratorDeps(executionId);
    await runPipelinePhase(deps, input.captureId, "verify", idempotencySuffix);

    const pipelineState = markUploadUploaded(
      (await loadPipelineState(input.captureId)) ?? INITIAL_PIPELINE_STATE,
    );
    await savePipelineState(input.captureId, pipelineState);

    watchdog.touch("ai_extract");
    const stream = input.onStreamEvent ? createAnalyzeStreamListener(input.onStreamEvent) : null;
    const trace = createAnalyzeTrace({
      captureId: ctx.captureId,
      correlationId: input.correlationId,
      companyId: null,
      pipelineVersion: CAPTURE_PIPELINE_VERSION,
      onPhase: stream?.listener,
    });
    ctx.traceId = trace.traceId;

    const analyze = await analyzeDocumentCaptureV41(input.captureId, input.userId, {
      correlationId: input.correlationId,
      bytes: verifyResult.bytes,
      mime: verifyResult.mime,
      trace,
    });
    stream?.stopHeartbeat();

    const aiTimeout = watchdog.check();
    if (aiTimeout) {
      const err = buildCapturePipelineError({
        code: aiTimeout,
        phase: "ai_extract",
        terminalState: "failed",
        message: "Analisi AI scaduta.",
        captureId: ctx.captureId,
        pipelineVersion,
        executionId,
        correlationId: input.correlationId,
        traceId: ctx.traceId,
      });
      ensureTerminal("failed", { code: err.code, message: err.message });
      return {
        ok: false,
        code: err.code,
        message: err.message,
        executionId,
        pipelineVersion,
        terminalState: "failed",
        correlationId: input.correlationId,
        traceId: ctx.traceId,
        finalize: verifyResult.finalize,
      };
    }

    if (!analyze.ok) {
      ensureTerminal("failed", { code: analyze.code, message: analyze.message });
      return {
        ...analyze,
        executionId,
        pipelineVersion,
        terminalState: "failed",
        finalize: verifyResult.finalize,
      };
    }

    await runPipelinePhase(deps, input.captureId, "ai_extract", idempotencySuffix);
    ensureTerminal("completed");
    return { ...analyze, finalize: verifyResult.finalize, executionId, pipelineVersion };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Pipeline non riuscita";
    ensureTerminal("failed", { code: "PIPELINE_PHASE_FAILED", message });
    return {
      ok: false,
      code: "PIPELINE_PHASE_FAILED",
      message,
      executionId,
      pipelineVersion,
      terminalState: "failed",
      correlationId: input.correlationId,
      traceId: ctx.traceId,
    };
  } finally {
    watchdog.dispose();
    releaseInFlight(input.captureId, executionId);
  }
}

export async function processDocumentCapture(input: {
  captureId: string;
  userId: string;
  correlationId?: string;
  clientPipelineVersion?: string | null;
  onStreamEvent?: (event: CaptureAnalyzeStreamEvent) => void;
  uploadDurationMs?: number;
}): Promise<RunCapturePipelineResult> {
  return runCapturePipeline(input);
}
