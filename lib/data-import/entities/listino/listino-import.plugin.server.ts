import "server-only";

import type { ImportEntityPlugin } from "@/lib/data-import/core/import-plugin";
import { generateImportTemplateXlsx } from "@/lib/data-import/core/template-generator.server";
import {
  MAGAZZINO_FIELD_PATTERNS,
  MAGAZZINO_IMPORT_FIELDS,
} from "@/lib/data-import/entities/magazzino/magazzino-import-schema";
import {
  buildMagazzinoImportPreview,
  parseMagazzinoImportFile,
} from "@/lib/data-import/entities/magazzino/magazzino-import-preview.server";
import { executeMagazzinoImport } from "@/lib/data-import/entities/magazzino/magazzino-import-execute.server";
import { magazzinoImportPlugin } from "@/lib/data-import/entities/magazzino/magazzino-import.plugin.server";

/** Listino ricambi — sync prezzi su codice OE (wrapper magazzino con strategia sync). */
export const listinoRicambiImportPlugin: ImportEntityPlugin = {
  ...magazzinoImportPlugin,
  id: "listino_ricambi",
  routeSlug: "listino",
  label: "Listino ricambi",
  status: "active",
  supportedStrategies: ["sync", "incremental", "initial"],
  defaultStrategy: "sync",
  duplicateRules: { defaultAction: "update", updateFields: ["costo", "descrizione", "marca"] },
  templateFilename: "template-import-listino.xlsx",
  templateSheetName: "Listino",
  uiEntry: { section: "magazzino", placement: "toolbar" },

  async parseFile(input) {
    const result = await parseMagazzinoImportFile(input);
    return { ...result, matrix: [], suggestedMapping: result.suggestedMapping, fields: MAGAZZINO_IMPORT_FIELDS };
  },

  async buildPreview(input) {
    return buildMagazzinoImportPreview({
      ...input,
      duplicateDefaultAction: "update",
      entity: "listino_ricambi",
    });
  },

  async execute(input) {
    return executeMagazzinoImport({
      batchId: input.batchId,
      userId: input.userId,
      fileName: input.fileName,
      decisions: input.decisions as Parameters<typeof executeMagazzinoImport>[0]["decisions"],
      updateFields: ["costo", "descrizione", "marca", "prezzo_vendita"],
    });
  },

  generateTemplate() {
    return generateImportTemplateXlsx(MAGAZZINO_IMPORT_FIELDS.filter((f) =>
      ["codice", "descrizione", "marca", "costo", "prezzo_vendita"].includes(f.key),
    ), { sheetName: "Listino" });
  },
};
