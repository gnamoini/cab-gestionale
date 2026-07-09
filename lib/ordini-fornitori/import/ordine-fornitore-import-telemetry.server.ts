import "server-only";

import type { OrdineFornitoreImportErrorCode } from "@/lib/ordini-fornitori/import/ordine-fornitore-import-error-codes";
import { traceRuntimeCoordinationServer } from "@/lib/observability/runtime-coordination-tracer.server";

export type OrdineFornitoreImportTelemetryInput = {
  operation: "upload_register" | "analyze" | "finalize" | "finalize_link" | "finalize_unlink";
  documentoId?: string;
  importFileId?: string;
  ordineId?: string;
  userId?: string | null;
  durationMs?: number;
  outcome: "ok" | "error";
  errorCode?: OrdineFornitoreImportErrorCode;
  storagePath?: string;
  bucket?: string;
  storageErrorCode?: string;
  isPolicyError?: boolean;
};

export function traceOrdineFornitoreImportOperation(input: OrdineFornitoreImportTelemetryInput): void {
  traceRuntimeCoordinationServer({
    type: input.outcome === "ok" ? "mutation_started" : "mic_invalidation_triggered",
    entityType: "ordine_fornitore_import",
    entityId: input.importFileId ?? input.documentoId ?? input.ordineId,
    scope: "ordini_fornitori_import",
    layer: "api",
    durationMs: input.durationMs,
    meta: {
      operation: input.operation,
      outcome: input.outcome,
      userId: input.userId ?? undefined,
      ordineId: input.ordineId ?? undefined,
      ...(input.storagePath ? { storagePath: input.storagePath } : {}),
      ...(input.bucket ? { bucket: input.bucket } : {}),
      ...(input.storageErrorCode ? { storageErrorCode: input.storageErrorCode } : {}),
      ...(input.isPolicyError !== undefined ? { isPolicyError: input.isPolicyError } : {}),
      ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    },
  });
}
