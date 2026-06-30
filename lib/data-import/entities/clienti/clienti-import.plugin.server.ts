import "server-only";

import type { ImportEntityPlugin, ImportRowAction } from "@/lib/data-import/core/import-plugin";
import { generateImportTemplateXlsx } from "@/lib/data-import/core/template-generator.server";
import {
  buildClientiImportPreview,
  parseClientiImportFile,
} from "@/lib/data-import/entities/clienti/clienti-import-preview.server";
import { executeClientiImport } from "@/lib/data-import/entities/clienti/clienti-import-execute.server";
import {
  CLIENTI_FIELD_PATTERNS,
  CLIENTI_IMPORT_FIELDS,
  type ClientiImportDecision,
} from "@/lib/data-import/entities/clienti/clienti-import-schema";

function buildClientiDecisions(
  preview: { rows: Array<Record<string, unknown>> },
  rowActions: Record<number, ImportRowAction>,
): ClientiImportDecision[] {
  return preview.rows.map((row) => {
    const idx = Number(row.rowIndex);
    const action = rowActions[idx] ?? "skip";
    return {
      rowIndex: idx,
      action: action === "replace" ? "update" : action,
      row: {
        rowIndex: idx,
        nomeDisplay: String(row.nomeDisplay ?? row.nome_display ?? ""),
        ragioneSociale: row.ragioneSociale ? String(row.ragioneSociale) : undefined,
        partitaIva: row.partitaIva ? String(row.partitaIva) : undefined,
        codiceFiscale: row.codiceFiscale ? String(row.codiceFiscale) : undefined,
        codiceDestinatario: row.codiceDestinatario ? String(row.codiceDestinatario) : undefined,
        pec: row.pec ? String(row.pec) : undefined,
        email: row.email ? String(row.email) : undefined,
        telefono: row.telefono ? String(row.telefono) : undefined,
        note: row.note ? String(row.note) : undefined,
      },
      duplicateClienteId: row.duplicateId ? String(row.duplicateId) : undefined,
    };
  });
}

export const clientiImportPlugin: ImportEntityPlugin = {
  id: "clienti_anagrafica",
  routeSlug: "clienti",
  label: "Clienti anagrafica",
  status: "active",
  fields: CLIENTI_IMPORT_FIELDS,
  patterns: CLIENTI_FIELD_PATTERNS,
  supportedStrategies: ["initial", "incremental"],
  defaultStrategy: "incremental",
  duplicateRules: { defaultAction: "skip" },
  allowedDuplicateActions: ["skip", "update", "create_new"],
  allowedRowActions: ["skip", "update", "create"],
  rowLabelKeys: ["nomeDisplay", "nome_display"],
  templateFilename: "template-import-clienti.xlsx",
  templateSheetName: "Clienti",
  permission: { kind: "manageSettings" },
  relatedEntities: ["clienti_anagrafica"],
  uiEntry: { section: "cli-cliente", placement: "settings" },

  async parseFile(input) {
    const result = await parseClientiImportFile(input);
    return { ...result, matrix: [], suggestedMapping: result.suggestedMapping, fields: result.fields };
  },

  async buildPreview(input) {
    return buildClientiImportPreview(input);
  },

  async execute(input) {
    return executeClientiImport({
      batchId: input.batchId,
      userId: input.userId,
      fileName: input.fileName,
      decisions: input.decisions as ClientiImportDecision[],
    });
  },

  buildDecisionsFromPreview(preview, rowActions) {
    return buildClientiDecisions(preview, rowActions);
  },

  generateTemplate() {
    return generateImportTemplateXlsx(CLIENTI_IMPORT_FIELDS, { sheetName: "Clienti" });
  },
};
