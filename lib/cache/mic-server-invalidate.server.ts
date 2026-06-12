import "server-only";

import { MIC_REGISTRY } from "@/lib/cache/mic-registry";
import type { MicEntityType } from "@/lib/cache/mic-types";
import { traceRuntimeCoordinationServer } from "@/lib/observability/runtime-coordination-tracer.server";
import { invalidatePdfArtifactScope } from "@/lib/pdf-artifacts/pdf-artifact-invalidate.server";

export async function runMicServerInvalidations(
  entityType: MicEntityType,
  entityId: string,
  correlationId?: string,
): Promise<{ pdfRemoved: number }> {
  const entry = MIC_REGISTRY[entityType];
  let pdfRemoved = 0;

  for (const scope of entry.pdfScopes) {
    const scopeId = typeof scope.scopeId === "function" ? scope.scopeId(entityId) : scope.scopeId;
    const removed = await invalidatePdfArtifactScope(scope.type, scopeId);
    pdfRemoved += removed;
    traceRuntimeCoordinationServer({
      type: "asset_regenerated",
      correlationId,
      entityType,
      entityId,
      scope: "pdf",
      layer: "mic",
      meta: { pdfType: scope.type, scopeId, pdfRemoved: removed },
    });
  }

  return { pdfRemoved };
}
