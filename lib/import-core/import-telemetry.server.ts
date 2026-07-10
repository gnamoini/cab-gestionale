import "server-only";

import { formatImportCorrelationDisplay } from "@/lib/import-core/correlation-id";
import type { ImportErrorCode } from "@/lib/import-core/import-error-catalog";
import { traceRuntimeCoordinationServer } from "@/lib/observability/runtime-coordination-tracer.server";

export type ImportTelemetryScope =
  | "ordini_fornitori_import"
  | "listino_import"
  | "document_capture"
  | "data_import"
  | "import_core";

export type ImportTelemetryInput = {
  scope: ImportTelemetryScope;
  operation: string;
  correlationId: string;
  outcome: "ok" | "error";
  userId?: string | null;
  companyId?: string | null;
  importFileId?: string;
  executionId?: string;
  documentoId?: string;
  captureId?: string;
  ordineId?: string;
  durationMs?: number;
  errorCode?: ImportErrorCode;
  meta?: Record<string, unknown>;
};

export function traceImportOperation(input: ImportTelemetryInput): void {
  const entityId =
    input.executionId ??
    input.importFileId ??
    input.captureId ??
    input.documentoId ??
    input.ordineId;

  traceRuntimeCoordinationServer({
    type: input.outcome === "ok" ? "mutation_started" : "mic_invalidation_triggered",
    correlationId: input.correlationId,
    entityType: "import",
    entityId,
    scope: input.scope,
    layer: "api",
    durationMs: input.durationMs,
    meta: {
      operation: input.operation,
      outcome: input.outcome,
      correlationDisplay: formatImportCorrelationDisplay(input.correlationId),
      userId: input.userId ?? undefined,
      companyId: input.companyId ?? undefined,
      importFileId: input.importFileId,
      executionId: input.executionId,
      documentoId: input.documentoId,
      captureId: input.captureId,
      ordineId: input.ordineId,
      errorCode: input.errorCode,
      ...input.meta,
    },
  });
}
