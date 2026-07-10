import assert from "node:assert/strict";
import { buildWorkbookStructure } from "@/lib/data-import/core/workbook-builder.server";
import type { NormalizedDataset } from "@/lib/data-import/core/normalized-dataset";
import type { ImportExportFieldDef } from "@/lib/data-import/core/field-schema";

const dataset: NormalizedDataset = {
  entity: "mezzi",
  pluginVersion: "mezzi-import@2.0.0",
  templateVersion: "2.0",
  schemaHash: "deadbeef",
  source: "spreadsheet",
  exportMode: "template",
  sheets: [{ name: "Mezzi", role: "parent", columns: [], rows: [] }],
  metadata: {},
};

const fields: ImportExportFieldDef[] = [
  { key: "targa", label: "Targa", required: true, example: "AB123CD" },
  { key: "cliente", label: "Cliente", required: true },
];

const wb = buildWorkbookStructure(dataset, fields, "template");
assert.ok(wb.sheets.some((s) => s.name === "_meta"));
assert.equal(wb.metadata.templateVersion, "2.0");
assert.equal(wb.metadata.entity, "mezzi");

const dataSheet = wb.sheets.find((s) => s.name === "Mezzi");
assert.ok(dataSheet);
assert.equal(dataSheet!.rows.length, 2);
assert.equal(dataSheet!.rows[0]?.[1], "Targa");

console.log("workbook-split.test.ts OK");
