import "server-only";

import { autoDetectColumnMapping } from "@/lib/data-import/core/column-mapper";
import { createImportBatch, updateImportBatchProgress } from "@/lib/data-import/core/batch-store.server";
import { decodeImportFileBase64 } from "@/lib/data-import/core/decode-import-file.server";
import type { ImportEntityPlugin, ImportRowAction } from "@/lib/data-import/core/import-plugin";
import { generateImportTemplateXlsx } from "@/lib/data-import/core/template-generator.server";
import { parseSpreadsheetBuffer } from "@/lib/data-import/core/parse-spreadsheet";
import type { FieldPatternSet } from "@/lib/data-import/core/column-mapper";
import type { ImportExecuteResult, ImportFieldDef, ImportMappingConfig, ImportPreviewRowBase } from "@/lib/data-import/core/types";
import { IMPORT_EXECUTE_CHUNK, IMPORT_MAX_PREVIEW_ROWS } from "@/lib/data-import/core/types";
import { lookupMezzoByTargaOrMatricola } from "@/lib/data-import/core/relation-resolver.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const PREVENTIVI_IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "cliente", label: "Cliente", required: true, example: "Rossi S.r.l." },
  { key: "targa", label: "Targa mezzo", example: "AB123CD" },
  { key: "matricola", label: "Matricola mezzo", example: "MAT-001" },
  { key: "totale", label: "Totale", example: "1500.00" },
  { key: "righe_json", label: "Righe (JSON)", description: "Array JSON [{descrizione,qty,prezzo}]" },
  { key: "note", label: "Note", example: "Preventivo import" },
];

export const PREVENTIVI_FIELD_PATTERNS: FieldPatternSet = {
  cliente: [/^cliente$/i],
  targa: [/^targa$/i],
  matricola: [/^matricola$/i],
  totale: [/^totale$/i, /^importo$/i],
  righe_json: [/^righe(\s*json)?$/i, /^dettagli$/i],
  note: [/^note?$/i],
};

type PreventivoImportRow = {
  rowIndex: number;
  cliente: string;
  targa?: string;
  matricola?: string;
  totale?: number;
  righe_json?: string;
  note?: string;
  mezzoId?: string;
};

function mapPreventiviRows(matrix: unknown[][], mapping: ImportMappingConfig): PreventivoImportRow[] {
  const col = (key: string) => mapping.columns.find((c) => c.targetField === key)?.sourceColumn;
  const out: PreventivoImportRow[] = [];
  for (let i = mapping.dataStartRowIndex; i < matrix.length; i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;
    const get = (key: string) => {
      const c = col(key);
      if (c == null) return undefined;
      const v = row[c];
      return v == null || String(v).trim() === "" ? undefined : String(v).trim();
    };
    const cliente = get("cliente") ?? "";
    if (!cliente) continue;
    const totaleRaw = get("totale");
    out.push({
      rowIndex: i + 1,
      cliente,
      targa: get("targa"),
      matricola: get("matricola"),
      totale: totaleRaw ? Number(String(totaleRaw).replace(",", ".")) || undefined : undefined,
      righe_json: get("righe_json"),
      note: get("note"),
    });
  }
  return out;
}

export const preventiviImportPlugin: ImportEntityPlugin = {
  id: "preventivi",
  routeSlug: "preventivi",
  label: "Preventivi",
  status: "active",
  fields: PREVENTIVI_IMPORT_FIELDS,
  patterns: PREVENTIVI_FIELD_PATTERNS,
  supportedStrategies: ["initial", "incremental"],
  defaultStrategy: "initial",
  duplicateRules: { defaultAction: "create_new" },
  allowedDuplicateActions: ["skip", "create_new"],
  allowedRowActions: ["skip", "create"],
  rowLabelKeys: ["cliente", "targa"],
  templateFilename: "template-import-preventivi.xlsx",
  templateSheetName: "Preventivi",
  permission: { kind: "module", module: "preventivi" },
  relatedEntities: ["mezzi", "clienti_anagrafica"],
  uiEntry: { section: "preventivi", placement: "toolbar" },

  async parseFile(input) {
    const bytes = decodeImportFileBase64(input.fileBase64);
    const parsed = parseSpreadsheetBuffer(bytes, input.fileName, input.sheetIndex ?? 0);
    const suggestedMapping = autoDetectColumnMapping(parsed.matrix, PREVENTIVI_IMPORT_FIELDS, PREVENTIVI_FIELD_PATTERNS);
    return { ...parsed, matrix: [], suggestedMapping, fields: PREVENTIVI_IMPORT_FIELDS };
  },

  async buildPreview(input) {
    const bytes = decodeImportFileBase64(input.fileBase64);
    const parsed = parseSpreadsheetBuffer(bytes, input.fileName, input.mapping.sheetIndex ?? 0);
    const allRows = mapPreventiviRows(parsed.matrix, input.mapping);
    const truncated = allRows.length > IMPORT_MAX_PREVIEW_ROWS;
    const rowsSlice = truncated ? allRows.slice(0, IMPORT_MAX_PREVIEW_ROWS) : allRows;

    const sb = await createSupabaseServerUserClient();
    const previewRows: Array<ImportPreviewRowBase & PreventivoImportRow> = [];

    for (const r of rowsSlice) {
      const issues: ImportPreviewRowBase["issues"] = [];
      const mezzoLookup = await lookupMezzoByTargaOrMatricola(sb, { targa: r.targa, matricola: r.matricola });
      if (!mezzoLookup.ok) {
        issues.push({ field: "targa", message: mezzoLookup.message, severity: "error" });
      }
      previewRows.push({
        ...r,
        mezzoId: mezzoLookup.ok ? mezzoLookup.mezzoId : undefined,
        severity: issues.some((i) => i.severity === "error") ? "error" : "valid",
        issues,
        suggestedAction: issues.length ? "skip" : "create_new",
      });
    }

    const batchId = await createImportBatch({
      entity: "preventivi",
      file_name: input.fileName,
      file_sha256: input.fileSha256,
      mapping: input.mapping as unknown as Record<string, unknown>,
      created_by: input.userId,
    });

    return {
      batchId,
      fileName: input.fileName,
      fields: PREVENTIVI_IMPORT_FIELDS,
      rows: previewRows,
      stats: {
        total: allRows.length,
        valid: previewRows.filter((r) => r.severity === "valid").length,
        warnings: previewRows.filter((r) => r.severity === "warning").length,
        errors: previewRows.filter((r) => r.severity === "error").length,
        duplicates: 0,
        truncated,
      },
      warnings: parsed.warnings,
    };
  },

  async execute(input) {
    const started = Date.now();
    const sb = await createSupabaseServerUserClient();
    await updateImportBatchProgress(input.batchId, { status: "running", started_at: new Date().toISOString() });

    const result: ImportExecuteResult = {
      batchId: input.batchId,
      status: "success",
      stats: { created: 0, updated: 0, skipped: 0, errors: 0, warnings: 0 },
      errors: [],
      durationMs: 0,
    };

    const decisions = input.decisions as Array<PreventivoImportRow & { action: ImportRowAction }>;

    for (let i = 0; i < decisions.length; i += IMPORT_EXECUTE_CHUNK) {
      for (const d of decisions.slice(i, i + IMPORT_EXECUTE_CHUNK)) {
        if (d.action === "skip") {
          result.stats.skipped += 1;
          continue;
        }
        if (!d.mezzoId) {
          result.stats.errors += 1;
          result.errors.push({ rowIndex: d.rowIndex, message: "Mezzo non risolto." });
          continue;
        }
        let dettagli: Record<string, unknown> = { righe: [] };
        if (d.righe_json) {
          try {
            dettagli = { righe: JSON.parse(d.righe_json) };
          } catch {
            result.stats.warnings += 1;
          }
        }
        const { error } = await sb.from("preventivi").insert({
          mezzo_id: d.mezzoId,
          cliente: d.cliente.trim(),
          totale: d.totale ?? 0,
          dettagli,
          lavorazione_id: null,
        });
        if (error) {
          result.stats.errors += 1;
          result.errors.push({ rowIndex: d.rowIndex, message: error.message });
        } else {
          result.stats.created += 1;
        }
      }
    }

    result.durationMs = Date.now() - started;
    result.status =
      result.stats.errors > 0 && result.stats.created === 0 ? "failed" : result.stats.errors > 0 ? "partial" : "success";
    await updateImportBatchProgress(input.batchId, {
      status: result.status,
      finished_at: new Date().toISOString(),
      stats: result.stats,
      error_log: result.errors.slice(0, 500),
    });
    return result;
  },

  buildDecisionsFromPreview(preview, rowActions) {
    return preview.rows.map((row) => ({
      rowIndex: Number(row.rowIndex),
      action: rowActions[Number(row.rowIndex)] ?? "skip",
      cliente: String(row.cliente ?? ""),
      targa: row.targa ? String(row.targa) : undefined,
      matricola: row.matricola ? String(row.matricola) : undefined,
      totale: typeof row.totale === "number" ? row.totale : undefined,
      righe_json: row.righe_json ? String(row.righe_json) : undefined,
      note: row.note ? String(row.note) : undefined,
      mezzoId: row.mezzoId ? String(row.mezzoId) : undefined,
    }));
  },

  generateTemplate() {
    return generateImportTemplateXlsx(PREVENTIVI_IMPORT_FIELDS, { sheetName: "Preventivi" });
  },
};
