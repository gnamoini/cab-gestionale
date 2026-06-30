import "server-only";

import { autoDetectColumnMapping } from "@/lib/data-import/core/column-mapper";
import { createImportBatch, updateImportBatchProgress } from "@/lib/data-import/core/batch-store.server";
import { decodeImportFileBase64 } from "@/lib/data-import/core/decode-import-file.server";
import type { ImportEntityPlugin, ImportRowAction } from "@/lib/data-import/core/import-plugin";
import { generateImportTemplateXlsx } from "@/lib/data-import/core/template-generator.server";
import { parseSpreadsheetBuffer } from "@/lib/data-import/core/parse-spreadsheet";
import type { FieldPatternSet } from "@/lib/data-import/core/column-mapper";
import type {
  ImportDuplicateAction,
  ImportEntity,
  ImportExecuteResult,
  ImportFieldDef,
  ImportMappingConfig,
  ImportPreviewRowBase,
} from "@/lib/data-import/core/types";
import { IMPORT_EXECUTE_CHUNK, IMPORT_MAX_PREVIEW_ROWS } from "@/lib/data-import/core/types";
import { createAddettoId, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { syncAddettoColorMap } from "@/lib/lavorazioni/addetto-colors-assign";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

const VALUE_FIELD: ImportFieldDef = {
  key: "valore",
  label: "Valore",
  required: true,
  example: "Esempio",
  description: "Voce da aggiungere all'elenco",
};

const VALUE_PATTERNS: FieldPatternSet = {
  valore: [/^valore$/i, /^nome$/i, /^label$/i, /^voce$/i, /^descrizione$/i],
};

export type SettingsListPluginConfig = {
  id: ImportEntity;
  routeSlug: string;
  label: string;
  module: string;
  settingsKey: string;
  listField: string;
  settingsSection: string;
  permission?: ImportEntityPlugin["permission"];
};

function norm(v: string): string {
  return v.trim().toLowerCase();
}

function mapValueRows(matrix: unknown[][], mapping: ImportMappingConfig) {
  const col = mapping.columns.find((c) => c.targetField === "valore")?.sourceColumn;
  const out: Array<{ rowIndex: number; valore: string }> = [];
  for (let i = mapping.dataStartRowIndex; i < matrix.length; i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;
    const raw = col != null ? row[col] : row[0];
    const valore = raw == null ? "" : String(raw).trim();
    if (!valore) continue;
    out.push({ rowIndex: i + 1, valore });
  }
  return out;
}

export function createSettingsListImportPlugin(config: SettingsListPluginConfig): ImportEntityPlugin {
  return {
    id: config.id,
    routeSlug: config.routeSlug,
    label: config.label,
    status: "active",
    fields: [VALUE_FIELD],
    patterns: VALUE_PATTERNS,
    supportedStrategies: ["merge", "replace", "initial"],
    defaultStrategy: "merge",
    duplicateRules: { defaultAction: "skip" },
    allowedDuplicateActions: ["skip", "create_new"],
    allowedRowActions: ["skip", "create"],
    rowLabelKeys: ["valore"],
    templateFilename: `template-import-${config.routeSlug}.xlsx`,
    templateSheetName: config.label,
    permission: config.permission ?? { kind: "manageSettings" },
    uiEntry: { section: config.settingsSection, placement: "settings" },

    async parseFile(input) {
      const bytes = decodeImportFileBase64(input.fileBase64);
      const parsed = parseSpreadsheetBuffer(bytes, input.fileName, input.sheetIndex ?? 0);
      const suggestedMapping = autoDetectColumnMapping(parsed.matrix, [VALUE_FIELD], VALUE_PATTERNS);
      return { ...parsed, matrix: [], suggestedMapping, fields: [VALUE_FIELD] };
    },

    async buildPreview(input) {
      const bytes = decodeImportFileBase64(input.fileBase64);
      const parsed = parseSpreadsheetBuffer(bytes, input.fileName, input.mapping.sheetIndex ?? 0);
      const allRows = mapValueRows(parsed.matrix, input.mapping);
      const truncated = allRows.length > IMPORT_MAX_PREVIEW_ROWS;
      const rowsSlice = truncated ? allRows.slice(0, IMPORT_MAX_PREVIEW_ROWS) : allRows;

      const sb = await createSupabaseServerUserClient();
      const { data: row } = await sb
        .from("app_settings")
        .select("payload")
        .eq("module", config.module)
        .eq("key", config.settingsKey)
        .maybeSingle();
      const payload = (row?.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>;
      const existing = Array.isArray(payload[config.listField]) ? (payload[config.listField] as string[]) : [];

      const previewRows: Array<ImportPreviewRowBase & { valore: string }> = rowsSlice.map((r) => {
        const dup = existing.find((x) => norm(x) === norm(r.valore));
        return {
          rowIndex: r.rowIndex,
          valore: r.valore,
          severity: dup ? "warning" : "valid",
          issues: dup ? [{ message: "Voce già presente", severity: "warning" as const }] : [],
          suggestedAction: dup ? "skip" : "create_new",
          duplicateLabel: dup ?? undefined,
        };
      });

      const batchId = await createImportBatch({
        entity: config.id,
        file_name: input.fileName,
        file_sha256: input.fileSha256,
        mapping: input.mapping as unknown as Record<string, unknown>,
        created_by: input.userId,
      });

      return {
        batchId,
        fileName: input.fileName,
        fields: [VALUE_FIELD],
        rows: previewRows,
        stats: {
          total: allRows.length,
          valid: previewRows.filter((r) => r.severity === "valid").length,
          warnings: previewRows.filter((r) => r.severity === "warning").length,
          errors: previewRows.filter((r) => r.severity === "error").length,
          duplicates: previewRows.filter((r) => r.duplicateLabel).length,
          truncated,
        },
        warnings: parsed.warnings,
        suggestedStrategy: previewRows.filter((r) => r.duplicateLabel).length / Math.max(allRows.length, 1) >= 0.3 ? "merge" : "initial",
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

      const strategy = input.strategy ?? "merge";
      const decisions = input.decisions as Array<{ rowIndex: number; action: ImportRowAction; valore: string }>;

      const { data: settingsRow } = await sb
        .from("app_settings")
        .select("payload")
        .eq("module", config.module)
        .eq("key", config.settingsKey)
        .maybeSingle();
      let payload = (settingsRow?.payload && typeof settingsRow.payload === "object" ? settingsRow.payload : {}) as Record<
        string,
        unknown
      >;

      if (config.id === "settings_addetti") {
        for (let i = 0; i < decisions.length; i += IMPORT_EXECUTE_CHUNK) {
          const chunk = decisions.slice(i, i + IMPORT_EXECUTE_CHUNK);
          for (const d of chunk) {
            if (d.action === "skip") {
              result.stats.skipped += 1;
              continue;
            }
            const nome = d.valore.trim();
            if (!nome) {
              result.stats.errors += 1;
              result.errors.push({ rowIndex: d.rowIndex, message: "Valore vuoto." });
              continue;
            }
            const prefs = payload as Record<string, unknown>;
            const records = Array.isArray(prefs.addettiRecords) ? ([...(prefs.addettiRecords as AddettoRecord[])] as AddettoRecord[]) : [];
            if (records.some((r) => norm(r.nome) === norm(nome))) {
              result.stats.skipped += 1;
              continue;
            }
            records.push({ id: createAddettoId(), nome, cognome: null });
            const addetti = records.map((r) => r.nome.trim()).filter(Boolean);
            const addettoColors = syncAddettoColorMap(addetti, (prefs.addettoColors as Record<string, string>) ?? {});
            payload = { ...prefs, addettiRecords: records, addetti, addettoColors };
            result.stats.created += 1;
          }
        }
        await sb.rpc("bulk_upsert_app_settings", {
          p_items: [{ module: config.module, key: config.settingsKey, payload }],
        });
      } else {
        let list = strategy === "replace" ? [] : Array.isArray(payload[config.listField]) ? [...(payload[config.listField] as string[])] : [];

        for (let i = 0; i < decisions.length; i += IMPORT_EXECUTE_CHUNK) {
          const chunk = decisions.slice(i, i + IMPORT_EXECUTE_CHUNK);
          for (const d of chunk) {
            if (d.action === "skip") {
              result.stats.skipped += 1;
              continue;
            }
            const val = d.valore.trim();
            if (!val) {
              result.stats.errors += 1;
              result.errors.push({ rowIndex: d.rowIndex, message: "Valore vuoto." });
              continue;
            }
            if (list.some((x) => norm(x) === norm(val))) {
              result.stats.skipped += 1;
              continue;
            }
            list.push(val);
            result.stats.created += 1;
          }
        }

        list.sort((a, b) => a.localeCompare(b, "it"));
        await sb.rpc("bulk_upsert_app_settings", {
          p_items: [{ module: config.module, key: config.settingsKey, payload: { ...payload, [config.listField]: list } }],
        });
      }

      result.durationMs = Date.now() - started;
      result.status = result.stats.errors > 0 && result.stats.created === 0 ? "failed" : result.stats.errors > 0 ? "partial" : "success";
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
        valore: String(row.valore ?? ""),
      }));
    },

    generateTemplate() {
      return generateImportTemplateXlsx([VALUE_FIELD], { sheetName: config.label });
    },
  };
}

export const SETTINGS_LIST_PLUGINS: ImportEntityPlugin[] = [
  createSettingsListImportPlugin({
    id: "settings_fornitori",
    routeSlug: "settings-fornitori",
    label: "Fornitori",
    module: "magazzino",
    settingsKey: "master",
    listField: "fornitori",
    settingsSection: "mag-fornitori",
  }),
  createSettingsListImportPlugin({
    id: "settings_produttori",
    routeSlug: "settings-produttori",
    label: "Produttori",
    module: "magazzino",
    settingsKey: "master",
    listField: "produttori",
    settingsSection: "mag-produttori",
  }),
  createSettingsListImportPlugin({
    id: "settings_categorie",
    routeSlug: "settings-categorie",
    label: "Categorie ricambi",
    module: "magazzino",
    settingsKey: "master",
    listField: "categorie",
    settingsSection: "mag-categorie",
  }),
  createSettingsListImportPlugin({
    id: "settings_marche",
    routeSlug: "settings-marche",
    label: "Marche ricambi",
    module: "magazzino",
    settingsKey: "master",
    listField: "marche",
    settingsSection: "mag-marche",
  }),
  createSettingsListImportPlugin({
    id: "settings_addetti",
    routeSlug: "settings-addetti",
    label: "Operatori / addetti",
    module: "lavorazioni",
    settingsKey: "prefs",
    listField: "addetti",
    settingsSection: "op-addetti",
  }),
  createSettingsListImportPlugin({
    id: "settings_cantieri",
    routeSlug: "settings-cantieri",
    label: "Cantieri",
    module: "mezzi",
    settingsKey: "liste",
    listField: "cantieri",
    settingsSection: "cli-cantiere",
  }),
  createSettingsListImportPlugin({
    id: "settings_utilizzatori",
    routeSlug: "settings-utilizzatori",
    label: "Utilizzatori",
    module: "mezzi",
    settingsKey: "liste",
    listField: "utilizzatori",
    settingsSection: "cli-utilizzatore",
  }),
];
