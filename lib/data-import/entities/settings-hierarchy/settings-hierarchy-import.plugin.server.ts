import "server-only";

import { autoDetectColumnMapping } from "@/lib/data-import/core/column-mapper";
import { createImportBatch, updateImportBatchProgress } from "@/lib/data-import/core/batch-store.server";
import { decodeImportFileBase64 } from "@/lib/data-import/core/decode-import-file.server";
import type { ImportEntityPlugin, ImportRowAction } from "@/lib/data-import/core/import-plugin";
import { generateImportTemplateXlsx } from "@/lib/data-import/core/template-generator.server";
import { parseSpreadsheetBuffer } from "@/lib/data-import/core/parse-spreadsheet";
import type { FieldPatternSet } from "@/lib/data-import/core/column-mapper";
import type { ImportEntity, ImportExecuteResult, ImportFieldDef, ImportMappingConfig, ImportPreviewRowBase } from "@/lib/data-import/core/types";
import { IMPORT_EXECUTE_CHUNK, IMPORT_MAX_PREVIEW_ROWS } from "@/lib/data-import/core/types";
import {
  aggiungiMarcaHierarchy,
  aggiungiModelloHierarchy,
  getHierarchyTree,
  type HierarchyTreeKey,
} from "@/lib/mezzi/hierarchy-list-prefs";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

const HIERARCHY_FIELDS: ImportFieldDef[] = [
  { key: "marca", label: "Marca", required: true, example: "Caterpillar" },
  { key: "modello", label: "Modello", required: true, example: "320D" },
  { key: "tipo", label: "Tipo", example: "Escavatore", description: "Solo per catalogo telai" },
];

const HIERARCHY_PATTERNS: FieldPatternSet = {
  marca: [/^marca$/i, /^brand$/i],
  modello: [/^modello$/i, /^model$/i],
  tipo: [/^tipo$/i, /^type$/i],
};

type HierarchyRow = { rowIndex: number; marca: string; modello: string; tipo?: string };

function mapHierarchyRows(matrix: unknown[][], mapping: ImportMappingConfig): HierarchyRow[] {
  const col = (key: string) => mapping.columns.find((c) => c.targetField === key)?.sourceColumn;
  const marcaCol = col("marca");
  const modelloCol = col("modello");
  const tipoCol = col("tipo");
  const out: HierarchyRow[] = [];
  for (let i = mapping.dataStartRowIndex; i < matrix.length; i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;
    const marca = marcaCol != null ? String(row[marcaCol] ?? "").trim() : String(row[0] ?? "").trim();
    const modello = modelloCol != null ? String(row[modelloCol] ?? "").trim() : String(row[1] ?? "").trim();
    const tipo = tipoCol != null ? String(row[tipoCol] ?? "").trim() : undefined;
    if (!marca || !modello) continue;
    out.push({ rowIndex: i + 1, marca, modello, tipo: tipo || undefined });
  }
  return out;
}

function norm(v: string): string {
  return v.trim().toLowerCase();
}

function createHierarchyPlugin(input: {
  id: ImportEntity;
  routeSlug: string;
  label: string;
  treeKey: HierarchyTreeKey;
  settingsSection: string;
  includeTipo: boolean;
}): ImportEntityPlugin {
  const fields = input.includeTipo ? HIERARCHY_FIELDS : HIERARCHY_FIELDS.filter((f) => f.key !== "tipo");

  return {
    id: input.id,
    routeSlug: input.routeSlug,
    label: input.label,
    status: "active",
    fields,
    patterns: HIERARCHY_PATTERNS,
    supportedStrategies: ["merge", "initial"],
    defaultStrategy: "merge",
    duplicateRules: { defaultAction: "skip" },
    allowedDuplicateActions: ["skip", "create_new"],
    allowedRowActions: ["skip", "create"],
    rowLabelKeys: ["marca", "modello"],
    templateFilename: `template-import-${input.routeSlug}.xlsx`,
    templateSheetName: input.label,
    permission: { kind: "manageSettings" },
    uiEntry: { section: input.settingsSection, placement: "settings" },

    async parseFile({ fileName, fileBase64, sheetIndex }) {
      const bytes = decodeImportFileBase64(fileBase64);
      const parsed = parseSpreadsheetBuffer(bytes, fileName, sheetIndex ?? 0);
      const suggestedMapping = autoDetectColumnMapping(parsed.matrix, fields, HIERARCHY_PATTERNS);
      return { ...parsed, matrix: [], suggestedMapping, fields };
    },

    async buildPreview({ userId, fileName, fileBase64, fileSha256, mapping }) {
      const bytes = decodeImportFileBase64(fileBase64);
      const parsed = parseSpreadsheetBuffer(bytes, fileName, mapping.sheetIndex ?? 0);
      const allRows = mapHierarchyRows(parsed.matrix, mapping);
      const truncated = allRows.length > IMPORT_MAX_PREVIEW_ROWS;
      const rowsSlice = truncated ? allRows.slice(0, IMPORT_MAX_PREVIEW_ROWS) : allRows;

      const sb = await createSupabaseServerUserClient();
      const { data: row } = await sb.from("app_settings").select("payload").eq("module", "mezzi").eq("key", "liste").maybeSingle();
      const liste = migrateMezziListePrefs((row?.payload ?? {}) as MezziListePrefs);
      const tree = getHierarchyTree(liste, input.treeKey);

      const previewRows: Array<ImportPreviewRowBase & HierarchyRow> = rowsSlice.map((r) => {
        const marcaNode = tree.find((m) => norm(m.nome) === norm(r.marca));
        const dup = marcaNode?.modelli.some((m) => norm(m.nome) === norm(r.modello));
        return {
          ...r,
          severity: dup ? "warning" : "valid",
          issues: dup ? [{ message: "Modello già presente per la marca", severity: "warning" as const }] : [],
          suggestedAction: dup ? "skip" : "create_new",
        };
      });

      const batchId = await createImportBatch({
        entity: input.id,
        file_name: fileName,
        file_sha256: fileSha256,
        mapping: mapping as unknown as Record<string, unknown>,
        created_by: userId,
      });

      return {
        batchId,
        fileName,
        fields,
        rows: previewRows,
        stats: {
          total: allRows.length,
          valid: previewRows.filter((r) => r.severity === "valid").length,
          warnings: previewRows.filter((r) => r.severity === "warning").length,
          errors: 0,
          duplicates: previewRows.filter((r) => r.severity === "warning").length,
          truncated,
        },
        warnings: parsed.warnings,
      };
    },

    async execute({ batchId, userId, decisions }) {
      const started = Date.now();
      const sb = await createSupabaseServerUserClient();
      await updateImportBatchProgress(batchId, { status: "running", started_at: new Date().toISOString() });

      const result: ImportExecuteResult = {
        batchId,
        status: "success",
        stats: { created: 0, updated: 0, skipped: 0, errors: 0, warnings: 0 },
        errors: [],
        durationMs: 0,
      };

      const { data: row } = await sb.from("app_settings").select("payload").eq("module", "mezzi").eq("key", "liste").maybeSingle();
      let liste = migrateMezziListePrefs((row?.payload ?? {}) as MezziListePrefs);

      const items = decisions as Array<HierarchyRow & { action: ImportRowAction }>;
      for (let i = 0; i < items.length; i += IMPORT_EXECUTE_CHUNK) {
        for (const d of items.slice(i, i + IMPORT_EXECUTE_CHUNK)) {
          if (d.action === "skip") {
            result.stats.skipped += 1;
            continue;
          }
          try {
            liste = aggiungiMarcaHierarchy(liste, input.treeKey, d.marca);
            const tree = getHierarchyTree(liste, input.treeKey);
            const marca = tree.find((m) => norm(m.nome) === norm(d.marca));
            if (!marca) throw new Error("Marca non creata.");
            liste = aggiungiModelloHierarchy(liste, input.treeKey, marca.id, d.modello);
            result.stats.created += 1;
          } catch (e) {
            result.stats.errors += 1;
            result.errors.push({ rowIndex: d.rowIndex, message: e instanceof Error ? e.message : "Errore" });
          }
        }
      }

      await sb.rpc("bulk_upsert_app_settings", {
        p_items: [{ module: "mezzi", key: "liste", payload: liste as unknown as Record<string, unknown> }],
      });

      result.durationMs = Date.now() - started;
      result.status = result.stats.errors > 0 && result.stats.created === 0 ? "failed" : result.stats.errors > 0 ? "partial" : "success";
      await updateImportBatchProgress(batchId, {
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
        marca: String(row.marca ?? ""),
        modello: String(row.modello ?? ""),
        tipo: row.tipo ? String(row.tipo) : undefined,
      }));
    },

    generateTemplate() {
      return generateImportTemplateXlsx(fields, { sheetName: input.label });
    },
  };
}

export const settingsHierarchyAttrezzaturePlugin = createHierarchyPlugin({
  id: "settings_hierarchy_attrezzature",
  routeSlug: "settings-attrezzature",
  label: "Catalogo attrezzature",
  treeKey: "attrezzature",
  settingsSection: "att-marca",
  includeTipo: false,
});

export const settingsHierarchyTelaiPlugin = createHierarchyPlugin({
  id: "settings_hierarchy_telai",
  routeSlug: "settings-telai",
  label: "Catalogo telai",
  treeKey: "telai",
  settingsSection: "tel-marca",
  includeTipo: true,
});
