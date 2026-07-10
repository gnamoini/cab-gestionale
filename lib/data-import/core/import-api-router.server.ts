import "server-only";

import { z } from "zod";
import { decodeImportFileBase64, sha256ImportFile } from "@/lib/data-import/core/decode-import-file.server";
import type { ImportStrategy } from "@/lib/data-import/core/import-plugin";
import type { ImportDuplicateAction } from "@/lib/data-import/core/types";
import { getImportPluginBySlug } from "@/lib/data-import/registry";
import { ImportExportRegistry } from "@/lib/data-import/registry/import-export-registry";
import { executeImportCommand } from "@/lib/data-import/core/command-executor.server";
import { computeSchemaHash, assessImportCompatibility } from "@/lib/data-import/core/template-compatibility";
import { isImportExcelActive } from "@/lib/data-import/import-capabilities";
import {
  assertBackupImportAllowed,
  extractWorkbookMeta,
  ImportValidationError,
  manifestHashWarnings,
} from "@/lib/data-import/core/backup-import-guard.server";

export const importParseRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileBase64: z.string().min(1),
  sheetIndex: z.number().int().min(0).optional(),
});

export const importMappingSchema = z.object({
  headerRowIndex: z.number().int().min(0),
  dataStartRowIndex: z.number().int().min(0),
  sheetIndex: z.number().int().min(0),
  columns: z.array(
    z.object({
      sourceColumn: z.number().int().min(0),
      targetField: z.string().min(1),
    }),
  ),
});

export const importPreviewRequestSchema = z.object({
  batchId: z.string().uuid().optional(),
  fileName: z.string().min(1),
  fileBase64: z.string().min(1),
  mapping: importMappingSchema,
  duplicateDefaultAction: z.enum(["skip", "update", "replace", "create_new"]).optional(),
  strategy: z.enum(["initial", "incremental", "sync", "merge", "replace"]).optional(),
});

export const importExecuteRequestSchema = z.object({
  batchId: z.string().uuid(),
  fileName: z.string().min(1),
  fileBase64: z.string().min(1),
  mapping: importMappingSchema,
  strategy: z.enum(["initial", "incremental", "sync", "merge", "replace"]).optional(),
  rules: z.record(z.string(), z.unknown()).optional(),
  decisions: z.array(z.record(z.string(), z.unknown())).optional(),
  rowActions: z.record(z.string(), z.string()).optional(),
  previewRows: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function handleImportParse(slug: string, body: unknown) {
  const parsed = importParseRequestSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, status: 400, error: "Parametri non validi" };
  const plugin = getImportPluginBySlug(slug);
  if (!isImportExcelActive(plugin.id)) {
    return { ok: false as const, status: 501, error: `Import ${plugin.label} in preparazione.` };
  }
  try {
    const bytes = decodeImportFileBase64(parsed.data.fileBase64);
    const meta = extractWorkbookMeta(bytes, parsed.data.fileName);
    assertBackupImportAllowed(meta, "parse");
    const result = await plugin.parseFile(parsed.data);
    const { matrix: _m, ...rest } = result;
    return { ok: true as const, data: rest };
  } catch (e) {
    if (e instanceof ImportValidationError) {
      return { ok: false as const, status: 400, error: e.message };
    }
    return { ok: false as const, status: 400, error: e instanceof Error ? e.message : "Analisi file non riuscita." };
  }
}

export async function handleImportPreview(slug: string, userId: string, body: unknown) {
  const parsed = importPreviewRequestSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, status: 400, error: "Parametri non validi" };
  const plugin = getImportPluginBySlug(slug);
  if (!isImportExcelActive(plugin.id)) {
    return { ok: false as const, status: 501, error: `Import ${plugin.label} in preparazione.` };
  }
  try {
    const bytes = decodeImportFileBase64(parsed.data.fileBase64);
    const fileSha256 = sha256ImportFile(bytes);
    const wbMeta = extractWorkbookMeta(bytes, parsed.data.fileName);
    assertBackupImportAllowed(wbMeta, "preview");
    const def = ImportExportRegistry.getDefinition(plugin.id);
    const compat = assessImportCompatibility({
      fileMeta: {
        entity: plugin.id,
        templateVersion: wbMeta.templateVersion,
        schemaHash: wbMeta.schemaHash,
        exportMode: wbMeta.exportMode,
      },
      pluginTemplateVersion: def.templateVersion,
      pluginEntity: plugin.id,
      requiredFieldKeys: plugin.fields.filter((f) => f.required).map((f) => f.key),
      detectedColumnKeys: parsed.data.mapping.columns.map((c) => c.targetField),
      fileSchemaHash: wbMeta.schemaHash,
      currentSchemaHash: computeSchemaHash(plugin.fields, "importable"),
    });
    if (!compat.ok) {
      return {
        ok: false as const,
        status: 400,
        error: compat.blockers.map((b) => b.message).join(" "),
      };
    }
    const result = await plugin.buildPreview({
      userId,
      fileName: parsed.data.fileName,
      fileBase64: parsed.data.fileBase64,
      fileSha256,
      mapping: parsed.data.mapping,
      duplicateDefaultAction: parsed.data.duplicateDefaultAction as ImportDuplicateAction | undefined,
      strategy: parsed.data.strategy as ImportStrategy | undefined,
    });
    const manifestWarnings = manifestHashWarnings(wbMeta);
    return {
      ok: true as const,
      data: {
        ...result,
        warnings: [...(result.warnings ?? []), ...compat.warnings.map((w) => w.message), ...manifestWarnings],
      },
    };
  } catch (e) {
    if (e instanceof ImportValidationError) {
      return { ok: false as const, status: 400, error: e.message };
    }
    return { ok: false as const, status: 400, error: e instanceof Error ? e.message : "Preview non riuscita." };
  }
}

export async function handleImportExecute(slug: string, userId: string, body: unknown) {
  const parsed = importExecuteRequestSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, status: 400, error: "Parametri non validi" };
  const plugin = getImportPluginBySlug(slug);
  if (!isImportExcelActive(plugin.id)) {
    return { ok: false as const, status: 501, error: `Import ${plugin.label} in preparazione.` };
  }
  try {
    let decisions = parsed.data.decisions;
    if (!decisions?.length && parsed.data.previewRows && parsed.data.rowActions) {
      const rowActions: Record<number, import("@/lib/data-import/core/import-plugin").ImportRowAction> = {};
      for (const [k, v] of Object.entries(parsed.data.rowActions)) {
        rowActions[Number(k)] = v as import("@/lib/data-import/core/import-plugin").ImportRowAction;
      }
      decisions = plugin.buildDecisionsFromPreview(
        {
          rows: parsed.data.previewRows as Array<import("@/lib/data-import/core/types").ImportPreviewRowBase & Record<string, unknown>>,
          batchId: parsed.data.batchId,
          fileName: parsed.data.fileName,
          fields: plugin.fields,
          stats: { total: 0, valid: 0, warnings: 0, errors: 0, duplicates: 0, truncated: false },
          warnings: [],
        },
        rowActions,
      ) as Record<string, unknown>[];
    }
    if (!decisions?.length) {
      return { ok: false as const, status: 400, error: "Nessuna decisione di import." };
    }
    const bytes = decodeImportFileBase64(parsed.data.fileBase64);
    const fileSha256 = sha256ImportFile(bytes);
    const def = ImportExportRegistry.getDefinition(plugin.id);
    const schemaHash = computeSchemaHash(plugin.fields, "importable");
    const cmdResult = await executeImportCommand(
      plugin,
      {
        kind: "import.execute",
        input: {
          batchId: parsed.data.batchId,
          userId,
          fileName: parsed.data.fileName,
          mapping: parsed.data.mapping,
          strategy: parsed.data.strategy as ImportStrategy | undefined,
          rules: parsed.data.rules,
          decisions,
        },
        fileBase64: parsed.data.fileBase64,
        fileName: parsed.data.fileName,
      },
      {
        entity: plugin.id,
        userId,
        batchId: parsed.data.batchId,
        fileSha256,
        schemaHash,
        pluginVersion: def.pluginVersion,
        templateVersion: def.templateVersion,
        importMode: parsed.data.strategy ?? "upsert",
        rowCount: decisions.length,
      },
    );
    if (!cmdResult.ok) {
      return {
        ok: false as const,
        status: cmdResult.duplicateBatchId ? 409 : 400,
        error: cmdResult.error ?? "Import non riuscito.",
      };
    }
    return { ok: true as const, data: cmdResult.result! };
  } catch (e) {
    return { ok: false as const, status: 400, error: e instanceof Error ? e.message : "Import non riuscito." };
  }
}

export function handleImportTemplate(slug: string): { ok: true; buffer: Buffer; filename: string } | { ok: false; status: number; error: string } {
  const plugin = getImportPluginBySlug(slug);
  try {
    const buffer = plugin.generateTemplate();
    return { ok: true, buffer, filename: plugin.templateFilename };
  } catch (e) {
    return { ok: false, status: 500, error: e instanceof Error ? e.message : "Template non generato." };
  }
}

export function getImportPluginMeta(slug: string) {
  const plugin = getImportPluginBySlug(slug);
  return {
    id: plugin.id,
    routeSlug: plugin.routeSlug,
    label: plugin.label,
    status: plugin.status,
    fields: plugin.fields,
    supportedStrategies: plugin.supportedStrategies,
    defaultStrategy: plugin.defaultStrategy,
    allowedDuplicateActions: plugin.allowedDuplicateActions,
    allowedRowActions: plugin.allowedRowActions,
    rowLabelKeys: plugin.rowLabelKeys,
    exportEnabled: plugin.exportEnabled ?? false,
  };
}
