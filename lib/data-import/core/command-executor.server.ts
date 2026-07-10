import "server-only";

import type { ImportExecuteResult } from "@/lib/data-import/core/types";
import type { ImportEntityPlugin, ImportExecuteInput } from "@/lib/data-import/core/import-plugin";
import { importExportEventBus } from "@/lib/data-import/core/event-bus";
import {
  checkImportFingerprint,
  hashDecisions,
  hashImportFingerprint,
  rememberSuccessfulFingerprint,
} from "@/lib/data-import/core/import-fingerprint";
import {
  finalizeImportBatchMetadata,
  findSuccessfulFingerprintDuplicate,
} from "@/lib/data-import/core/batch-store.server";
import { recordImportBatchEntities } from "@/lib/data-import/core/import-batch-entities.server";
import {
  assertBackupImportAllowed,
  extractWorkbookMeta,
  ImportValidationError,
} from "@/lib/data-import/core/backup-import-guard.server";
import { decodeImportFileBase64 } from "@/lib/data-import/core/decode-import-file.server";

export type ImportCommand = {
  kind: "import.execute";
  input: ImportExecuteInput;
  fileBase64?: string;
  fileName?: string;
};

export type CommandContext = {
  entity: string;
  userId: string;
  batchId: string;
  fileSha256?: string;
  schemaHash?: string;
  pluginVersion?: string;
  templateVersion?: string;
  importMode?: string;
  rowCount?: number;
  forceReimport?: boolean;
};

export type CommandResult = {
  ok: boolean;
  result?: ImportExecuteResult;
  error?: string;
  duplicateBatchId?: string;
};

export async function executeImportCommand(
  plugin: ImportEntityPlugin,
  command: ImportCommand,
  ctx: CommandContext,
): Promise<CommandResult> {
  const { input } = command;

  if (command.fileBase64 && command.fileName) {
    const bytes = decodeImportFileBase64(command.fileBase64);
    const meta = extractWorkbookMeta(bytes, command.fileName);
    try {
      assertBackupImportAllowed(meta, "execute");
    } catch (e) {
      if (e instanceof ImportValidationError) {
        return { ok: false, error: e.message };
      }
      throw e;
    }
  }

  importExportEventBus.emit({
    type: "ImportStarted",
    batchId: ctx.batchId,
    entity: plugin.id,
    rowCount: ctx.rowCount ?? input.decisions.length,
  });

  let fpHash: string | undefined;
  if (ctx.fileSha256 && ctx.schemaHash) {
    fpHash = hashImportFingerprint({
      fileSha256: ctx.fileSha256,
      schemaHash: ctx.schemaHash,
      entity: plugin.id,
      importMode: ctx.importMode ?? "upsert",
      rowCount: ctx.rowCount ?? input.decisions.length,
      decisionsHash: hashDecisions(input.decisions),
    });
    const dbDup = await findSuccessfulFingerprintDuplicate({
      createdBy: ctx.userId,
      entity: plugin.id,
      fingerprintHash: fpHash,
      importMode: ctx.importMode ?? "upsert",
    });
    const dup = checkImportFingerprint(fpHash, dbDup);
    if (dup.status === "duplicate" && !ctx.forceReimport) {
      return {
        ok: false,
        error: `Import già eseguito (batch ${dup.batchId}).`,
        duplicateBatchId: dup.batchId,
      };
    }
  }

  try {
    const result = await plugin.execute(input);
    importExportEventBus.emit({
      type: "RowsCommitted",
      batchId: ctx.batchId,
      created: result.stats.created,
      updated: result.stats.updated,
      skipped: result.stats.skipped,
    });
    importExportEventBus.emit({ type: "Completed", id: ctx.batchId, stats: result.stats });

    if (ctx.fileSha256 && ctx.schemaHash && result.status === "success" && fpHash) {
      rememberSuccessfulFingerprint(fpHash, ctx.batchId, new Date().toISOString());
      const createdIds = result.stats.createdEntityIds ?? [];
      if (createdIds.length) {
        await recordImportBatchEntities(ctx.batchId, plugin.id, createdIds);
      }
      await finalizeImportBatchMetadata(ctx.batchId, {
        fingerprint_hash: fpHash,
        template_version: ctx.templateVersion,
        plugin_version: ctx.pluginVersion,
        schema_hash: ctx.schemaHash,
        import_mode: ctx.importMode ?? "upsert",
        created_entity_ids: createdIds,
        finished_at: new Date().toISOString(),
      });
    }

    return { ok: true, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Execute failed";
    importExportEventBus.emit({ type: "Failed", id: ctx.batchId, error: msg });
    return { ok: false, error: msg };
  }
}
