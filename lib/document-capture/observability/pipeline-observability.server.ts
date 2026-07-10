import "server-only";

import { traceDocumentCaptureOperation } from "@/lib/document-capture/document-capture-telemetry.server";
import type { PipelinePhase } from "@/lib/document-capture/orchestrator/pipeline-orchestrator";

export function tracePipelinePhase(input: {
  captureId: string;
  phase: PipelinePhase;
  outcome: "ok" | "error";
  durationMs?: number;
  reused?: boolean;
}): void {
  traceDocumentCaptureOperation({
    operation: `pipeline:${input.phase}`,
    captureId: input.captureId,
    durationMs: input.durationMs,
    outcome: input.outcome,
    errorCode: input.outcome === "error" ? "APPLY_FAILED" : undefined,
  });
}

export function traceUserAuditEvent(input: {
  captureId: string;
  event: string;
  userId?: string;
}): void {
  traceDocumentCaptureOperation({
    operation: `audit:${input.event}`,
    captureId: input.captureId,
    userId: input.userId,
    outcome: "ok",
  });
}
