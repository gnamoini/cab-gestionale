import "server-only";

import { traceDocumentCaptureOperation } from "@/lib/document-capture/document-capture-telemetry.server";
import type { CapturePipelineTerminalState } from "@/lib/document-capture/orchestrator/pipeline-types";

export type PipelineTelemetryEvent = {
  captureId: string;
  pipelineVersion: string;
  executionId: string;
  correlationId?: string;
  traceId?: string;
  phase?: string;
  terminalState?: CapturePipelineTerminalState;
  elapsedMs: number;
  requestSeq?: number;
  outcome?: "ok" | "error";
  errorCode?: string;
  detail?: string;
};

let requestSeqCounter = 0;

export function nextPipelineRequestSeq(): number {
  requestSeqCounter += 1;
  return requestSeqCounter;
}

export function traceCapturePipelineEvent(event: PipelineTelemetryEvent): void {
  traceDocumentCaptureOperation({
    operation: event.terminalState ? `pipeline:${event.terminalState}` : `pipeline:${event.phase ?? "event"}`,
    captureId: event.captureId,
    durationMs: event.elapsedMs,
    outcome: event.outcome ?? (event.terminalState === "failed" ? "error" : "ok"),
    errorCode: event.errorCode as Parameters<typeof traceDocumentCaptureOperation>[0]["errorCode"],
  });

  if (process.env.DOCUMENT_CAPTURE_PIPELINE_LOG === "1" || process.env.NODE_ENV !== "production") {
    console.info(
      JSON.stringify({
        type: "capture_pipeline",
        ...event,
        ts: new Date().toISOString(),
      }),
    );
  }
}
