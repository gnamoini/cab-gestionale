import "server-only";

import type { ImportExportPluginDefinition } from "@/lib/data-import/core/plugin-definition";
import type { NormalizedDataset } from "@/lib/data-import/core/normalized-dataset";
import { computeSchemaHash } from "@/lib/data-import/core/template-compatibility";

export function createEmptyTemplateDataset(def: ImportExportPluginDefinition): NormalizedDataset {
  const sheetName = def.templateSheetName ?? "Dati";
  return {
    entity: def.id,
    pluginVersion: def.pluginVersion,
    templateVersion: def.templateVersion,
    schemaHash: computeSchemaHash(def.fields, "template"),
    source: "spreadsheet",
    exportMode: "template",
    sheets: [
      {
        name: sheetName,
        role: "parent",
        columns: def.fields.map((f, index) => ({ key: f.key, label: f.label, index })),
        rows: [],
      },
    ],
    metadata: { mode: "template" },
  };
}
