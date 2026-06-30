import "server-only";

import { autoDetectColumnMapping } from "@/lib/data-import/core/column-mapper";
import { parseSpreadsheetBuffer } from "@/lib/data-import/core/parse-spreadsheet";
import { IMPORT_MAX_PREVIEW_ROWS } from "@/lib/data-import/core/types";
import { decodeImportFileBase64 } from "@/lib/data-import/core/decode-import-file.server";
import { mapMatrixToMagazzinoRows } from "@/lib/data-import/entities/magazzino/magazzino-import-mapper";
import {
  MAGAZZINO_FIELD_PATTERNS,
  MAGAZZINO_IMPORT_FIELDS,
} from "@/lib/data-import/entities/magazzino/magazzino-import-schema";
import {
  buildMagazzinoDuplicateIndex,
  buildMagazzinoPreviewRow,
} from "@/lib/data-import/entities/magazzino/magazzino-import-validator";
import { startMagazzinoImportBatch } from "@/lib/data-import/entities/magazzino/magazzino-import-execute.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { ImportDuplicateAction, ImportEntity, ImportMappingConfig } from "@/lib/data-import/core/types";

export async function parseMagazzinoImportFile(input: {
  fileName: string;
  fileBase64: string;
  sheetIndex?: number;
}) {
  const bytes = decodeImportFileBase64(input.fileBase64);
  const parsed = parseSpreadsheetBuffer(bytes, input.fileName, input.sheetIndex ?? 0);
  const autoMapping = autoDetectColumnMapping(parsed.matrix, MAGAZZINO_IMPORT_FIELDS, MAGAZZINO_FIELD_PATTERNS);
  return { ...parsed, suggestedMapping: autoMapping, fields: MAGAZZINO_IMPORT_FIELDS };
}

export async function buildMagazzinoImportPreview(input: {
  userId: string;
  fileName: string;
  fileBase64: string;
  fileSha256?: string;
  entity?: ImportEntity;
  mapping: ImportMappingConfig;
  duplicateDefaultAction?: ImportDuplicateAction;
}) {
  const bytes = decodeImportFileBase64(input.fileBase64);
  const parsed = parseSpreadsheetBuffer(bytes, input.fileName, input.mapping.sheetIndex ?? 0);
  const allRows = mapMatrixToMagazzinoRows(parsed.matrix, input.mapping);
  const truncated = allRows.length > IMPORT_MAX_PREVIEW_ROWS;
  const rowsSlice = truncated ? allRows.slice(0, IMPORT_MAX_PREVIEW_ROWS) : allRows;

  const sb = await createSupabaseServerUserClient();
  const { data: existing } = await sb.from("magazzino_ricambi").select("id, codice, nome, costo, quantita");
  const index = buildMagazzinoDuplicateIndex(
    (existing ?? []).map((r) => ({
      id: r.id,
      codice: r.codice,
      nome: r.nome,
      costo: r.costo,
      quantita: Number(r.quantita),
    })),
  );

  const defaultAction = input.duplicateDefaultAction ?? "update";
  const previewRows = rowsSlice.map((r) => buildMagazzinoPreviewRow(r, index, defaultAction));

  const batchId = await startMagazzinoImportBatch(input.userId, input.fileName, input.mapping as unknown as Record<string, unknown>, {
    entity: input.entity,
    fileSha256: input.fileSha256,
  });

  return {
    batchId,
    fileName: input.fileName,
    fields: MAGAZZINO_IMPORT_FIELDS,
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
