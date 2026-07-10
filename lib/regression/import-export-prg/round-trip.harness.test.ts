import assert from "node:assert/strict";
import { buildWorkbookStructure } from "@/lib/data-import/core/workbook-builder.server";
import type { NormalizedDataset } from "@/lib/data-import/core/normalized-dataset";
import { assertBackupImportAllowed } from "@/lib/data-import/core/backup-import-policy";

const dataset: NormalizedDataset = {
  entity: "mezzi",
  pluginVersion: "mezzi-import@2.0.0",
  templateVersion: "2.0",
  schemaHash: "abc",
  source: "spreadsheet",
  sheets: [{ name: "Mezzi", role: "parent", columns: [], rows: [] }],
  metadata: {},
};

const wb = buildWorkbookStructure(
  dataset,
  [
    { key: "targa", label: "Targa", required: true },
    { key: "cliente", label: "Cliente", required: true },
  ],
  "importable",
);

const metaSheet = wb.sheets.find((s) => s.name === "_meta");
assert.ok(metaSheet);
const exportModeRow = metaSheet!.rows.find((r) => r[0] === "ExportMode");
assert.equal(exportModeRow?.[1], "importable");
const manifestRow = metaSheet!.rows.find((r) => r[0] === "ManifestHash");
assert.ok(manifestRow?.[1]);

let backupBlocked = false;
try {
  assertBackupImportAllowed({ exportMode: "backup" }, "parse");
} catch {
  backupBlocked = true;
}
assert.ok(backupBlocked);

console.log("import-export-prg/round-trip.harness.test.ts OK");
