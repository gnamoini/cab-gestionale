import "server-only";

import type { DocumentCaptureErrorCode } from "@/lib/document-capture/document-capture-error-codes";
import { traceRuntimeCoordinationServer } from "@/lib/observability/runtime-coordination-tracer.server";

export type DocumentCaptureTelemetryInput = {
  operation: string;
  captureId?: string;
  companyId?: string | null;
  userId?: string | null;
  durationMs?: number;
  outcome: "ok" | "error";
  errorCode?: DocumentCaptureErrorCode;
};

export function traceDocumentCaptureOperation(input: DocumentCaptureTelemetryInput): void {
  traceRuntimeCoordinationServer({
    type: input.outcome === "ok" ? "mutation_started" : "mic_invalidation_triggered",
    entityType: "document_capture",
    entityId: input.captureId,
    scope: "document_capture",
    layer: "api",
    durationMs: input.durationMs,
    meta: {
      operation: input.operation,
      outcome: input.outcome,
      companyId: input.companyId ?? undefined,
      userId: input.userId ?? undefined,
      ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    },
  });
}
