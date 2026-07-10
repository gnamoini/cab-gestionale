import "server-only";

import { importExportEventBus } from "@/lib/data-import/core/event-bus";
import { recordImportExportTelemetry } from "@/lib/data-import/core/import-export-telemetry.server";

let bootstrapped = false;
const startedAt = new Map<string, { kind: "import" | "export"; entity: string; userId?: string; t0: number }>();

/** Idempotent bootstrap: telemetry listener on event bus. */
export function ensureImportExportFrameworkBootstrapped(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  importExportEventBus.subscribe((event) => {
    if (event.type === "ImportStarted") {
      startedAt.set(event.batchId, { kind: "import", entity: event.entity, t0: Date.now() });
      return;
    }
    if (event.type === "ExportStarted") {
      startedAt.set(event.jobId, { kind: "export", entity: event.entity, t0: Date.now() });
      return;
    }
    if (event.type === "Completed") {
      const hit = startedAt.get(event.id);
      if (!hit) return;
      startedAt.delete(event.id);
      const stats = event.stats as { created?: number; updated?: number; rowCount?: number };
      const rowCount =
        typeof stats.rowCount === "number"
          ? stats.rowCount
          : (stats.created ?? 0) + (stats.updated ?? 0);
      void recordImportExportTelemetry({
        kind: hit.kind,
        entity: hit.entity,
        userId: hit.userId ?? "system",
        durationMs: Date.now() - hit.t0,
        rowCount,
        batchId: hit.kind === "import" ? event.id : undefined,
      });
    }
    if (event.type === "Failed") {
      startedAt.delete(event.id);
    }
  });
}
