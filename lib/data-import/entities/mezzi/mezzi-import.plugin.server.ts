import "server-only";

import { autoDetectColumnMapping } from "@/lib/data-import/core/column-mapper";
import { createImportBatch, updateImportBatchProgress } from "@/lib/data-import/core/batch-store.server";
import { decodeImportFileBase64 } from "@/lib/data-import/core/decode-import-file.server";
import type { ImportEntityPlugin, ImportRowAction } from "@/lib/data-import/core/import-plugin";
import { generateImportTemplateXlsx } from "@/lib/data-import/core/template-generator.server";
import { parseSpreadsheetBuffer, cellString } from "@/lib/data-import/core/parse-spreadsheet";
import { normalizeVin } from "@/lib/mezzi/vin-normalize";
import type { FieldPatternSet } from "@/lib/data-import/core/column-mapper";
import type { ImportExecuteResult, ImportFieldDef, ImportMappingConfig, ImportPreviewRowBase } from "@/lib/data-import/core/types";
import { IMPORT_EXECUTE_CHUNK, IMPORT_MAX_PREVIEW_ROWS } from "@/lib/data-import/core/types";
import { lookupClienteByNameOrPiva } from "@/lib/data-import/core/relation-resolver.server";
import { attachMezzoEntityKey } from "@/lib/validation/entity-persistence";
import { sanitizeMezzoWritePayload } from "@/lib/validation/services/mezzi-payload";
import { upsertAttrezzaturaForMezzoImport } from "@/lib/data-import/entities/mezzi/mezzi-import-attrezzatura.server";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const MEZZI_IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "cliente", label: "Cliente", required: true, example: "Rossi S.r.l." },
  { key: "targa", label: "Targa", example: "AB123CD" },
  { key: "matricola", label: "Matricola", example: "MAT-001" },
  { key: "marca", label: "Marca attrezzatura", example: "Caterpillar" },
  { key: "modello", label: "Modello", example: "320D" },
  { key: "tipo_attrezzatura", label: "Tipo attrezzatura", example: "Escavatore" },
  { key: "utilizzatore", label: "Utilizzatore", example: "Mario Rossi" },
  { key: "numero_scuderia", label: "N. scuderia", example: "12" },
  { key: "anno", label: "Anno", example: "2020" },
  { key: "cantiere", label: "Cantiere", example: "Milano Nord" },
  { key: "telaio", label: "VIN / Telaio", example: "WVWZZZ1JZ3W386752" },
];

export const MEZZI_FIELD_PATTERNS: FieldPatternSet = {
  cliente: [/^cliente$/i, /^ragione(\s*sociale)?$/i],
  targa: [/^targa$/i, /^plate$/i],
  matricola: [/^matricola$/i, /^serial$/i],
  marca: [/^marca$/i, /^brand$/i],
  modello: [/^modello$/i, /^model$/i],
  tipo_attrezzatura: [/^tipo(\s*attrezzatura)?$/i],
  utilizzatore: [/^utilizzatore$/i],
  numero_scuderia: [/^n\.?\s*scuderia$/i, /^scuderia$/i],
  anno: [/^anno$/i, /^year$/i],
  cantiere: [/^cantiere$/i],
  telaio: [/^telaio$/i, /^vin$/i],
};

type MezziImportRow = {
  rowIndex: number;
  cliente: string;
  targa?: string;
  matricola?: string;
  marca?: string;
  modello?: string;
  tipo_attrezzatura?: string;
  utilizzatore?: string;
  numero_scuderia?: string;
  anno?: number;
  cantiere?: string;
  telaio?: string;
  dualVinTelaio?: boolean;
};

function findHeaderColumns(matrix: unknown[][], headerRowIndex: number): string[] {
  return (matrix[headerRowIndex] ?? []).map((c) => cellString(c));
}

function findVinTelaioColumnIndexes(headers: string[]): { vin?: number; telaio?: number } {
  let vin: number | undefined;
  let telaio: number | undefined;
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i]?.trim();
    if (!h) continue;
    if (/^vin$/i.test(h)) vin = i;
    else if (/^telaio$/i.test(h)) telaio = i;
  }
  return { vin, telaio };
}

function mapMezziRows(matrix: unknown[][], mapping: ImportMappingConfig): MezziImportRow[] {
  const col = (key: string) => mapping.columns.find((c) => c.targetField === key)?.sourceColumn;
  const headers = findHeaderColumns(matrix, mapping.headerRowIndex);
  const vinTelaioCols = findVinTelaioColumnIndexes(headers);
  const out: MezziImportRow[] = [];
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
    const vinRaw =
      vinTelaioCols.vin != null ? row[vinTelaioCols.vin] : undefined;
    const telaioRaw =
      vinTelaioCols.telaio != null ? row[vinTelaioCols.telaio] : undefined;
    const vinCell = vinRaw == null || String(vinRaw).trim() === "" ? undefined : String(vinRaw).trim();
    const telaioCell = telaioRaw == null || String(telaioRaw).trim() === "" ? undefined : String(telaioRaw).trim();
    const dualVinTelaio = Boolean(vinCell && telaioCell);
    const telaioValue = dualVinTelaio ? undefined : (vinCell ?? telaioCell ?? get("telaio"));
    const annoRaw = get("anno");
    out.push({
      rowIndex: i + 1,
      cliente,
      targa: get("targa"),
      matricola: get("matricola"),
      marca: get("marca"),
      modello: get("modello"),
      tipo_attrezzatura: get("tipo_attrezzatura"),
      utilizzatore: get("utilizzatore"),
      numero_scuderia: get("numero_scuderia"),
      anno: annoRaw ? Number(annoRaw) || undefined : undefined,
      cantiere: get("cantiere"),
      telaio: telaioValue,
      dualVinTelaio,
    });
  }
  return out;
}

function norm(v: string): string {
  return v.trim().toLowerCase();
}

export const mezziImportPlugin: ImportEntityPlugin = {
  id: "mezzi",
  routeSlug: "mezzi",
  label: "Mezzi",
  status: "active",
  fields: MEZZI_IMPORT_FIELDS,
  patterns: MEZZI_FIELD_PATTERNS,
  supportedStrategies: ["initial", "incremental"],
  defaultStrategy: "incremental",
  duplicateRules: { defaultAction: "skip" },
  allowedDuplicateActions: ["skip", "update", "create_new"],
  allowedRowActions: ["skip", "update", "create"],
  rowLabelKeys: ["targa", "matricola", "cliente"],
  templateFilename: "template-import-mezzi.xlsx",
  templateSheetName: "Mezzi",
  permission: { kind: "module", module: "mezzi" },
  relatedEntities: ["clienti_anagrafica"],
  uiEntry: { section: "mezzi", placement: "toolbar" },

  async parseFile(input) {
    const bytes = decodeImportFileBase64(input.fileBase64);
    const parsed = parseSpreadsheetBuffer(bytes, input.fileName, input.sheetIndex ?? 0);
    const suggestedMapping = autoDetectColumnMapping(parsed.matrix, MEZZI_IMPORT_FIELDS, MEZZI_FIELD_PATTERNS);
    return { ...parsed, matrix: [], suggestedMapping, fields: MEZZI_IMPORT_FIELDS };
  },

  async buildPreview(input) {
    const bytes = decodeImportFileBase64(input.fileBase64);
    const parsed = parseSpreadsheetBuffer(bytes, input.fileName, input.mapping.sheetIndex ?? 0);
    const allRows = mapMezziRows(parsed.matrix, input.mapping);
    const truncated = allRows.length > IMPORT_MAX_PREVIEW_ROWS;
    const rowsSlice = truncated ? allRows.slice(0, IMPORT_MAX_PREVIEW_ROWS) : allRows;

    const sb = await createSupabaseServerUserClient();
    const [{ data: existingMezzi }, { data: existingAtt }] = await Promise.all([
      sb.from("mezzi").select("id, targa, matricola, cliente"),
      sb.from("attrezzature").select("id, mezzo_id, matricola"),
    ]);

    const previewRows: Array<ImportPreviewRowBase & MezziImportRow> = [];
    for (const r of rowsSlice) {
      const issues: ImportPreviewRowBase["issues"] = [];
      if (!r.targa && !r.matricola) {
        issues.push({ field: "targa", message: "Specificare targa o matricola", severity: "error" });
      }
      if (r.dualVinTelaio) {
        issues.push({
          field: "telaio",
          message: "Non valorizzare contemporaneamente colonne VIN e TELAIO nella stessa riga.",
          severity: "error",
        });
      }
      const clienteLookup = await lookupClienteByNameOrPiva(sb, { nome: r.cliente });
      if (!clienteLookup.ok) {
        issues.push({ field: "cliente", message: clienteLookup.message, severity: "warning" });
      }
      let dup: { id: string; label?: string } | undefined;
      if (r.targa) {
        const targa = r.targa;
        const byTarga = (existingMezzi ?? []).find(
          (m) => m.targa && norm(m.targa) === norm(targa),
        );
        if (byTarga) dup = { id: byTarga.id, label: byTarga.targa ?? undefined };
      }
      if (!dup && r.matricola) {
        const matricola = r.matricola;
        const byAttMat = (existingAtt ?? []).find(
          (a) => a.matricola && norm(a.matricola) === norm(matricola),
        );
        if (byAttMat) dup = { id: byAttMat.mezzo_id, label: matricola };
        else {
          const legacy = (existingMezzi ?? []).find(
            (m) => m.matricola && norm(m.matricola) === norm(matricola),
          );
          if (legacy) dup = { id: legacy.id, label: legacy.matricola ?? matricola };
        }
      }
      const severity = issues.some((i) => i.severity === "error") ? "error" : issues.length ? "warning" : "valid";
      previewRows.push({
        ...r,
        severity,
        issues,
        suggestedAction: dup ? "skip" : issues.some((i) => i.severity === "error") ? "skip" : "create_new",
        duplicateId: dup?.id,
        duplicateLabel: dup?.label ?? dup?.id,
      });
    }

    const batchId = await createImportBatch({
      entity: "mezzi",
      file_name: input.fileName,
      file_sha256: input.fileSha256,
      mapping: input.mapping as unknown as Record<string, unknown>,
      created_by: input.userId,
    });

    return {
      batchId,
      fileName: input.fileName,
      fields: MEZZI_IMPORT_FIELDS,
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
  },

  async execute(input) {
    const started = Date.now();
    const sb = await createSupabaseServerUserClient();
    await updateImportBatchProgress(input.batchId, { status: "running", started_at: new Date().toISOString() });

    const result: ImportExecuteResult = {
      batchId: input.batchId,
      status: "success",
      stats: { created: 0, updated: 0, skipped: 0, errors: 0, warnings: 0, createdEntityIds: [] },
      errors: [],
      durationMs: 0,
    };

    const decisions = input.decisions as Array<MezziImportRow & { action: ImportRowAction; duplicateId?: string }>;

    for (let i = 0; i < decisions.length; i += IMPORT_EXECUTE_CHUNK) {
      for (const d of decisions.slice(i, i + IMPORT_EXECUTE_CHUNK)) {
        if (d.action === "skip") {
          result.stats.skipped += 1;
          continue;
        }
        if (!d.targa && !d.matricola) {
          result.stats.errors += 1;
          result.errors.push({ rowIndex: d.rowIndex, message: "Targa o matricola obbligatoria." });
          continue;
        }
        const clienteLookup = await lookupClienteByNameOrPiva(sb, { nome: d.cliente });
        const clienteLabel = clienteLookup.ok ? clienteLookup.canonical : d.cliente;

        const meta: Record<string, unknown> = {};
        if (d.cantiere) meta.cantiere = d.cantiere;

        const telaioNum = d.telaio ? normalizeVin(d.telaio) : null;
        const payload = attachMezzoEntityKey(
          sanitizeMezzoWritePayload(
            {
              cliente: clienteLabel,
              utilizzatore: d.utilizzatore ?? null,
              marca: d.marca ?? undefined,
              modello: d.modello ?? undefined,
              targa: d.targa ?? undefined,
              matricola: d.matricola ?? undefined,
              numero_scuderia: d.numero_scuderia ?? null,
              tipo_attrezzatura: d.tipo_attrezzatura ?? null,
              anno: d.anno ?? null,
              telaio_num: telaioNum,
              meta,
            },
            { v2Enabled: true, source: "mezziImport.execute" },
          ),
        );

        if ((d.action === "update" || d.action === "replace") && d.duplicateId) {
          const { error } = await sb.from("mezzi").update(payload).eq("id", d.duplicateId);
          if (error) {
            result.stats.errors += 1;
            result.errors.push({ rowIndex: d.rowIndex, message: error.message });
          } else {
            const attRes = await upsertAttrezzaturaForMezzoImport(sb, d.duplicateId, d);
            if (!attRes.ok) {
              result.stats.errors += 1;
              result.errors.push({ rowIndex: d.rowIndex, message: attRes.message });
            } else {
              result.stats.updated += 1;
            }
          }
        } else if (d.action === "create") {
          const { data: inserted, error } = await sb.from("mezzi").insert(payload).select("id").single();
          if (error) {
            result.stats.errors += 1;
            result.errors.push({ rowIndex: d.rowIndex, message: error.message });
          } else {
            const mezzoId = String((inserted as { id: string }).id);
            const attRes = await upsertAttrezzaturaForMezzoImport(sb, mezzoId, d);
            if (!attRes.ok) {
              await sb.from("mezzi").delete().eq("id", mezzoId);
              result.stats.errors += 1;
              result.errors.push({ rowIndex: d.rowIndex, message: attRes.message });
            } else {
              result.stats.created += 1;
              result.stats.createdEntityIds?.push(mezzoId);
            }
          }
        }
      }
    }

    result.durationMs = Date.now() - started;
    result.status =
      result.stats.errors > 0 && result.stats.created + result.stats.updated === 0
        ? "failed"
        : result.stats.errors > 0
          ? "partial"
          : "success";
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
      marca: row.marca ? String(row.marca) : undefined,
      modello: row.modello ? String(row.modello) : undefined,
      tipo_attrezzatura: row.tipo_attrezzatura ? String(row.tipo_attrezzatura) : undefined,
      utilizzatore: row.utilizzatore ? String(row.utilizzatore) : undefined,
      numero_scuderia: row.numero_scuderia ? String(row.numero_scuderia) : undefined,
      anno: typeof row.anno === "number" ? row.anno : undefined,
      cantiere: row.cantiere ? String(row.cantiere) : undefined,
      telaio: row.telaio ? String(row.telaio) : undefined,
      duplicateId: row.duplicateId ? String(row.duplicateId) : undefined,
    }));
  },

  generateTemplate() {
    return generateImportTemplateXlsx(MEZZI_IMPORT_FIELDS, { sheetName: "Mezzi" });
  },
};
