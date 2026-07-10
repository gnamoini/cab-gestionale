import "server-only";

import type { ExportMode } from "@/lib/data-import/core/field-schema";
import type { ExportScope } from "@/lib/data-import/core/plugin-definition";
import { ImportExportRegistry } from "@/lib/data-import/registry/import-export-registry";
import { excelExportSinkAdapter } from "@/lib/data-import/adapters/excel-export-sink.server";
import { importExportEventBus } from "@/lib/data-import/core/event-bus";
import { runBeforeExport, runAfterExport } from "@/lib/data-import/core/plugin-lifecycle";
import { recordImportExportTelemetry } from "@/lib/data-import/core/import-export-telemetry.server";
import { buildWorkbookStructure } from "@/lib/data-import/core/workbook-builder.server";
import { renderWorkbookToXlsx } from "@/lib/data-import/core/workbook-styler.server";
import type { ImportEntity } from "@/lib/data-import/core/types";
import { createEmptyTemplateDataset } from "@/lib/data-import/core/export-orchestrator-utils.server";

const ASYNC_EXPORT_ROW_THRESHOLD = 2000;
const ZIP_ROW_THRESHOLD = 5000;

export type ExportRequest = {
  entity: ImportEntity;
  userId: string;
  mode: ExportMode;
  format: "xlsx" | "csv" | "zip";
  scope?: ExportScope;
};

export async function runExport(request: ExportRequest): Promise<{
  buffer: Buffer;
  filename: string;
  asyncRecommended: boolean;
}> {
  const def = ImportExportRegistry.getDefinition(request.entity);
  const jobId = `export-${request.entity}-${Date.now()}`;
  const started = Date.now();

  importExportEventBus.emit({ type: "ExportStarted", jobId, entity: request.entity });

  const hookCtx = { entity: request.entity, userId: request.userId };
  await runBeforeExport(hookCtx, request.scope ?? {}, def.hooks);

  let dataset;
  if (request.mode === "template") {
    dataset = createEmptyTemplateDataset(def);
  } else {
    if (!def.snapshotProvider) {
      throw new Error(`Export non disponibile per ${def.label}.`);
    }
    dataset = await def.snapshotProvider.fetch({
      userId: request.userId,
      scope: request.scope,
      mode: request.mode,
    });
  }

  const rowCount = dataset.sheets.reduce((n, s) => n + s.rows.length, 0);
  const asyncRecommended = rowCount >= ASYNC_EXPORT_ROW_THRESHOLD;

  let buffer: Buffer;
  if (request.format === "xlsx" || request.format === "zip") {
    if (request.format === "zip" && rowCount >= ZIP_ROW_THRESHOLD) {
      const structure = buildWorkbookStructure(dataset, def.fields, request.mode);
      buffer = renderWorkbookToXlsx(structure);
      const { gzipSync } = await import("node:zlib");
      buffer = gzipSync(buffer);
    } else {
      buffer = await excelExportSinkAdapter.render({
        dataset,
        fields: def.fields,
        fileName: def.templateFilename,
      });
    }
  } else {
    const { generateStubCsvExport } = await import("@/lib/data-import/core/export-plugin");
    const parent = dataset.sheets.find((s) => s.role === "parent") ?? dataset.sheets[0];
    const rows = parent?.rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const [k, cell] of Object.entries(r.cells)) out[k] = cell.parsed ?? cell.raw;
      return out;
    }) ?? [];
    buffer = await generateStubCsvExport(def.fields, rows);
  }

  await runAfterExport(hookCtx, buffer, def.hooks);

  const durationMs = Date.now() - started;
  await recordImportExportTelemetry({
    kind: "export",
    entity: request.entity,
    userId: request.userId,
    durationMs,
    rowCount,
    exportMode: request.mode,
    strategy: def.snapshotProvider?.strategy ?? "none",
  });

  importExportEventBus.emit({ type: "ExportProgress", jobId, percent: 100 });
  importExportEventBus.emit({ type: "Completed", id: jobId, stats: { rowCount, durationMs } });

  const ext = request.format === "zip" ? "zip" : request.format;
  const modeSuffix = request.mode === "template" ? "template" : request.mode;
  return {
    buffer,
    filename: `export-${def.routeSlug}-${modeSuffix}.${ext}`,
    asyncRecommended,
  };
}
