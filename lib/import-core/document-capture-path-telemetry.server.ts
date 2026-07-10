import "server-only";

import { isDocumentCaptureV41Enabled } from "@/lib/document-capture/document-capture-v41.server";
import { traceImportOperation } from "@/lib/import-core/import-telemetry.server";
import { gestionaleLogger } from "@/lib/observability/logger";

let legacyPathUseCount = 0;

export function traceDocumentCapturePipelinePath(input: {
  correlationId: string;
  captureId: string;
  operation: "analyze" | "validation" | "interpretation" | "document_model";
  userId?: string | null;
  companyId?: string | null;
}): "v41" | "legacy" {
  const pipeline: "v41" | "legacy" = isDocumentCaptureV41Enabled() ? "v41" : "legacy";

  if (pipeline === "legacy") {
    legacyPathUseCount += 1;
    gestionaleLogger.warn("import.document_capture.legacy_path", {
      operation: "system",
      meta: {
        captureId: input.captureId,
        operation: input.operation,
        legacyPathUseCount,
        hint: "Set DOCUMENT_CAPTURE_V41=1 after soak (Sprint 3)",
      },
    });
  }

  traceImportOperation({
    scope: "document_capture",
    operation: `${input.operation}_${pipeline}`,
    correlationId: input.correlationId,
    outcome: "ok",
    userId: input.userId,
    companyId: input.companyId,
    captureId: input.captureId,
    meta: { pipeline, legacyPathUseCount },
  });

  return pipeline;
}

export function getDocumentCaptureLegacyPathUseCount(): number {
  return legacyPathUseCount;
}
