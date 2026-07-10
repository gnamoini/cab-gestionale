import type { NormalizedDataset } from "@/lib/data-import/core/normalized-dataset";
import type { ImportExportFieldDef, ExportMode } from "@/lib/data-import/core/field-schema";
import { isFieldExportIncluded } from "@/lib/data-import/core/field-schema";
import type { TemplateMetadata } from "@/lib/data-import/core/template-compatibility";
import { buildTemplateMetadata } from "@/lib/data-import/core/template-compatibility";
import { computeManifestHash } from "@/lib/data-import/core/backup-import-policy";

export type WorkbookSheetData = {
  name: string;
  hidden?: boolean;
  rows: unknown[][];
};

export type WorkbookStructure = {
  sheets: WorkbookSheetData[];
  metadata: TemplateMetadata;
  fieldStyles: Array<{ colIndex: number; sheetName: string; style: "required" | "protected" | "computed" | "optional" }>;
};

const META_SHEET = "_meta";

export function buildWorkbookStructure(
  dataset: NormalizedDataset,
  fields: ImportExportFieldDef[],
  mode: ExportMode,
): WorkbookStructure {
  const metadata = buildTemplateMetadata({
    entity: dataset.entity,
    pluginVersion: dataset.pluginVersion,
    templateVersion: dataset.templateVersion,
    fields,
    exportMode: mode,
  });

  const exportFields = fields.filter((f) => isFieldExportIncluded(f, mode));
  const sheetNames = dataset.sheets.map((s) => s.name);
  const columnKeys = exportFields.map((f) => f.key);
  const manifestHash = computeManifestHash({
    sheetNames,
    columnKeys,
    exportMode: mode,
    templateVersion: metadata.templateVersion,
  });
  metadata.manifestHash = manifestHash;
  const sheets: WorkbookSheetData[] = [];

  const metaRows: unknown[][] = [
    ["Key", "Value"],
    ["TemplateVersion", metadata.templateVersion],
    ["PluginVersion", metadata.pluginVersion],
    ["Entity", metadata.entity],
    ["SchemaHash", metadata.schemaHash],
    ["ExportMode", metadata.exportMode],
    ["GeneratedAt", metadata.generatedAt],
    ["ManifestHash", metadata.manifestHash],
  ];
  sheets.push({ name: META_SHEET, hidden: true, rows: metaRows });

  if (mode === "template") {
    const header = ["Importa", ...exportFields.map((f) => f.label)];
    const example = ["SI", ...exportFields.map((f) => f.example ?? "")];
    const mainName = dataset.sheets[0]?.name ?? "Dati";
    sheets.push({ name: mainName, rows: [header, example] });
  } else {
    for (const sheet of dataset.sheets) {
      if (sheet.role === "lookup" || sheet.role === "meta") continue;
      const sheetFields = exportFields.filter(
        (f) => sheet.role === "parent" || !f.relational || f.relational.parentSheet === sheet.name,
      );
      const header = ["Importa", ...sheetFields.map((f) => f.label)];
      const dataRows = sheet.rows
        .filter((r) => !r.skip)
        .map((row) => [
          "SI",
          ...sheetFields.map((f) => {
            const cell = row.cells[f.key];
            const v = cell?.parsed ?? cell?.raw;
            if (v == null) return "";
            if (typeof v === "object") return JSON.stringify(v);
            return v;
          }),
        ]);
      sheets.push({ name: sheet.name, rows: [header, ...dataRows] });
    }
  }

  const instructions: unknown[][] = [
    ["Campo", "Obbligatorio", "Descrizione"],
    ...exportFields.map((f) => [
      f.label,
      f.required ? "Sì" : "No",
      f.description ?? "",
    ]),
    [],
    ["Legenda colori", "", ""],
    ["Arancione", "", "Obbligatorio"],
    ["Grigio", "", "Protetto / calcolato"],
    ["Blu chiaro", "", "Solo export"],
  ];
  sheets.push({ name: "Istruzioni", rows: instructions });

  const fieldStyles: WorkbookStructure["fieldStyles"] = [];
  for (const sheet of sheets) {
    if (sheet.name === META_SHEET || sheet.name === "Istruzioni") continue;
    exportFields.forEach((f, i) => {
      const colIndex = i + 1;
      let style: "required" | "protected" | "computed" | "optional" = "optional";
      if (f.required) style = "required";
      else if (f.computed || f.importWritable === false) style = "protected";
      fieldStyles.push({ colIndex, sheetName: sheet.name, style });
    });
  }

  return { sheets, metadata, fieldStyles };
}
