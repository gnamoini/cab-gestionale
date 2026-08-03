import type { DocumentCaptureErrorCode } from "@/lib/document-capture/document-capture-error-codes";
import type { PipelinePhase } from "@/lib/document-capture/orchestrator/pipeline-orchestrator";
import type { CapturePipelineTerminalState } from "@/lib/document-capture/orchestrator/pipeline-types";
import type { PipelineWatchdogTimeoutCode } from "@/lib/document-capture/orchestrator/pipeline-watchdog";

export const CAPTURE_PIPELINE_ERROR_CODES = [
  "TIMEOUT_PHASE_VERIFY",
  "TIMEOUT_PHASE_READ",
  "TIMEOUT_PHASE_AI",
  "TIMEOUT_PHASE_PROJECTION",
  "TIMEOUT_PHASE_VALIDATE",
  "PIPELINE_VERSION_STALE",
  "STREAM_ENDED_WITHOUT_TERMINAL",
  "ANALYZE_IN_PROGRESS",
  "PIPELINE_PHASE_FAILED",
] as const;

export type CapturePipelineErrorCode =
  | DocumentCaptureErrorCode
  | (typeof CAPTURE_PIPELINE_ERROR_CODES)[number];

export type CapturePipelineError = {
  code: CapturePipelineErrorCode;
  phase: PipelinePhase | "verify" | "upload";
  terminalState: Extract<CapturePipelineTerminalState, "failed" | "cancelled">;
  message: string;
  detail?: string;
  retryable: boolean;
  captureId: string;
  pipelineVersion: string;
  executionId: string;
  correlationId?: string;
  traceId?: string;
};

export function isCapturePipelineRetryable(code: CapturePipelineErrorCode): boolean {
  return (
    code === "RATE_LIMITED" ||
    code === "ANALYZE_GEMINI_FAIL" ||
    code === "ANALYZE_STORAGE" ||
    code === "UPLOAD_FAILED"
  );
}

export function buildCapturePipelineError(input: {
  code: CapturePipelineErrorCode;
  phase: PipelinePhase | "verify" | "upload";
  terminalState: Extract<CapturePipelineTerminalState, "failed" | "cancelled">;
  message: string;
  detail?: string;
  captureId: string;
  pipelineVersion: string;
  executionId: string;
  correlationId?: string;
  traceId?: string;
}): CapturePipelineError {
  return {
    ...input,
    retryable: isCapturePipelineRetryable(input.code),
  };
}

export function watchdogCodeToPipelineError(
  code: PipelineWatchdogTimeoutCode,
  ctx: Pick<CapturePipelineError, "captureId" | "pipelineVersion" | "executionId" | "traceId" | "correlationId">,
): CapturePipelineError {
  const phase =
    code === "TIMEOUT_PHASE_VERIFY"
      ? "verify"
      : code === "TIMEOUT_PHASE_READ"
        ? "physical_parse"
        : code === "TIMEOUT_PHASE_AI"
          ? "ai_extract"
          : code === "TIMEOUT_PHASE_PROJECTION"
            ? "project"
            : "validate";
  return buildCapturePipelineError({
    code,
    phase,
    terminalState: "failed",
    message: "Operazione scaduta. Riprova con un nuovo caricamento.",
    detail: code,
    ...ctx,
  });
}
