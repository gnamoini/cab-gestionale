import "server-only";

import { runExport, type ExportRequest } from "@/lib/data-import/core/export-orchestrator.server";
import type { ImportEntity } from "@/lib/data-import/core/types";
import type { ExportFormat } from "@/lib/data-import/core/export-plugin";
import { ImportExportRegistry } from "@/lib/data-import/registry/import-export-registry";
import type { ExportMode } from "@/lib/data-import/core/field-schema";

export async function handleExportEntity(
  entity: ImportEntity,
  format: ExportFormat,
  opts?: { userId?: string; mode?: ExportMode; scope?: Record<string, unknown> },
): Promise<Buffer> {
  const def = ImportExportRegistry.getDefinition(entity);
  if (!def.snapshotProvider && opts?.mode !== "template") {
    throw new Error(`Export non abilitato per ${def.label}.`);
  }

  const mode = opts?.mode ?? "importable";
  const fmt: "xlsx" | "csv" | "zip" =
    format === "zip" ? "zip" : format === "xlsx" ? "xlsx" : "csv";

  const { buffer } = await runExport({
    entity,
    userId: opts?.userId ?? "system",
    mode,
    format: fmt,
    scope: opts?.scope,
  });
  return buffer;
}

export async function handleExportEntityV3(request: ExportRequest) {
  return runExport(request);
}
