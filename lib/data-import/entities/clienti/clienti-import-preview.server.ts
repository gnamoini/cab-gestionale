import "server-only";

import { autoDetectColumnMapping } from "@/lib/data-import/core/column-mapper";
import { parseSpreadsheetBuffer } from "@/lib/data-import/core/parse-spreadsheet";
import { IMPORT_MAX_PREVIEW_ROWS } from "@/lib/data-import/core/types";
import { decodeImportFileBase64 } from "@/lib/data-import/core/decode-import-file.server";
import { mapMatrixToClientiRows } from "@/lib/data-import/entities/clienti/clienti-import-mapper";
import {
  CLIENTI_FIELD_PATTERNS,
  CLIENTI_IMPORT_FIELDS,
} from "@/lib/data-import/entities/clienti/clienti-import-schema";
import {
  buildClientiDuplicateIndex,
  buildClientiPreviewRow,
} from "@/lib/data-import/entities/clienti/clienti-import-validator";
import { startClientiImportBatch } from "@/lib/data-import/entities/clienti/clienti-import-execute.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { ImportDuplicateAction, ImportMappingConfig } from "@/lib/data-import/core/types";

export async function parseClientiImportFile(input: {
  fileName: string;
  fileBase64: string;
  sheetIndex?: number;
}) {
  const bytes = decodeImportFileBase64(input.fileBase64);
  const parsed = parseSpreadsheetBuffer(bytes, input.fileName, input.sheetIndex ?? 0);
  const autoMapping = autoDetectColumnMapping(parsed.matrix, CLIENTI_IMPORT_FIELDS, CLIENTI_FIELD_PATTERNS);
  return { ...parsed, suggestedMapping: autoMapping, fields: CLIENTI_IMPORT_FIELDS };
}

export async function buildClientiImportPreview(input: {
  userId: string;
  fileName: string;
  fileBase64: string;
  fileSha256?: string;
  mapping: ImportMappingConfig;
  duplicateDefaultAction?: ImportDuplicateAction;
}) {
  const bytes = decodeImportFileBase64(input.fileBase64);
  const parsed = parseSpreadsheetBuffer(bytes, input.fileName, input.mapping.sheetIndex ?? 0);
  const allRows = mapMatrixToClientiRows(parsed.matrix, input.mapping);
  const truncated = allRows.length > IMPORT_MAX_PREVIEW_ROWS;
  const rowsSlice = truncated ? allRows.slice(0, IMPORT_MAX_PREVIEW_ROWS) : allRows;

  const sb = await createSupabaseServerUserClient();
  const { data: existing } = await sb
    .from("clienti_anagrafiche")
    .select("id, nome_display, entity_key, partita_iva");
  const index = buildClientiDuplicateIndex(
    (existing ?? []).map((r) => ({
      id: r.id,
      nome_display: r.nome_display,
      entity_key: r.entity_key,
      partita_iva: r.partita_iva,
    })),
  );

  const defaultAction = input.duplicateDefaultAction ?? "skip";
  const previewRows = rowsSlice.map((r) => buildClientiPreviewRow(r, index, defaultAction));

  const batchId = await startClientiImportBatch(input.userId, input.fileName, input.mapping as unknown as Record<string, unknown>, {
    fileSha256: input.fileSha256,
  });

  return {
    batchId,
    fileName: input.fileName,
    fields: CLIENTI_IMPORT_FIELDS,
    rows: previewRows,
    stats: {
      total: allRows.length,
      valid: previewRows.filter((r) => r.severity === "valid").length,
      warnings: previewRows.filter((r) => r.severity === "warning").length,
      errors: previewRows.filter((r) => r.severity === "error").length,
      duplicates: previewRows.filter((r) => r.duplicateId).length,
      truncated,
    },
    warnings: parsed.warnings,
  };
}
