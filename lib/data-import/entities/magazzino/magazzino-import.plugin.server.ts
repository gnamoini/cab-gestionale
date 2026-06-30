import "server-only";

import type { ImportEntityPlugin, ImportRowAction } from "@/lib/data-import/core/import-plugin";
import { generateImportTemplateXlsx } from "@/lib/data-import/core/template-generator.server";
import {
  buildMagazzinoImportPreview,
  parseMagazzinoImportFile,
} from "@/lib/data-import/entities/magazzino/magazzino-import-preview.server";
import { executeMagazzinoImport } from "@/lib/data-import/entities/magazzino/magazzino-import-execute.server";
import {
  MAGAZZINO_FIELD_PATTERNS,
  MAGAZZINO_IMPORT_FIELDS,
  type MagazzinoImportDecision,
} from "@/lib/data-import/entities/magazzino/magazzino-import-schema";

function buildMagazzinoDecisions(
  preview: { rows: Array<Record<string, unknown>> },
  rowActions: Record<number, ImportRowAction>,
): MagazzinoImportDecision[] {
  return preview.rows.map((row) => {
    const idx = Number(row.rowIndex);
    const action = rowActions[idx] ?? "skip";
    return {
      rowIndex: idx,
      action,
      row: {
        rowIndex: idx,
        codice: String(row.codice ?? ""),
        descrizione: String(row.descrizione ?? ""),
        marca: row.marca ? String(row.marca) : undefined,
        quantita: typeof row.quantita === "number" ? row.quantita : undefined,
        costo: typeof row.costo === "number" ? row.costo : undefined,
        prezzo_vendita: typeof row.prezzo_vendita === "number" ? row.prezzo_vendita : undefined,
        categoria: row.categoria ? String(row.categoria) : undefined,
        note: row.note ? String(row.note) : undefined,
        unita_misura: row.unita_misura ? String(row.unita_misura) : undefined,
        scorta_minima: typeof row.scorta_minima === "number" ? row.scorta_minima : undefined,
        sconto_percent: typeof row.sconto_percent === "number" ? row.sconto_percent : undefined,
      },
      duplicateRicambioId: row.duplicateId ? String(row.duplicateId) : undefined,
    };
  });
}

export const magazzinoImportPlugin: ImportEntityPlugin = {
  id: "magazzino_ricambi",
  routeSlug: "magazzino",
  label: "Magazzino ricambi",
  status: "active",
  fields: MAGAZZINO_IMPORT_FIELDS,
  patterns: MAGAZZINO_FIELD_PATTERNS,
  supportedStrategies: ["initial", "incremental", "replace"],
  defaultStrategy: "incremental",
  duplicateRules: { defaultAction: "update" },
  allowedDuplicateActions: ["skip", "update", "replace", "create_new"],
  allowedRowActions: ["skip", "update", "replace", "create"],
  rowLabelKeys: ["codice", "descrizione"],
  templateFilename: "template-import-magazzino.xlsx",
  templateSheetName: "Magazzino",
  permission: { kind: "module", module: "magazzino", overwriteRequiresAdmin: true },
  exportEnabled: true,
  uiEntry: { section: "magazzino", placement: "toolbar" },

  async parseFile(input) {
    const result = await parseMagazzinoImportFile(input);
    return {
      ...result,
      matrix: [],
      suggestedMapping: result.suggestedMapping,
      fields: result.fields,
    };
  },

  async buildPreview(input) {
    return buildMagazzinoImportPreview(input);
  },

  async execute(input) {
    const updateFields = Array.isArray(input.rules?.updateFields)
      ? (input.rules!.updateFields as string[])
      : undefined;
    return executeMagazzinoImport({
      batchId: input.batchId,
      userId: input.userId,
      fileName: input.fileName,
      decisions: input.decisions as MagazzinoImportDecision[],
      updateFields,
    });
  },

  buildDecisionsFromPreview(preview, rowActions) {
    return buildMagazzinoDecisions(preview, rowActions);
  },

  generateTemplate() {
    return generateImportTemplateXlsx(MAGAZZINO_IMPORT_FIELDS, { sheetName: "Magazzino" });
  },
};
