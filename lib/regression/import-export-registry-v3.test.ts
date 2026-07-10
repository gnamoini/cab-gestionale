import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const V3_CORE = [
  "lib/data-import/core/normalized-dataset.ts",
  "lib/data-import/core/data-source.ts",
  "lib/data-import/core/export-sink.ts",
  "lib/data-import/core/command-executor.server.ts",
  "lib/data-import/core/event-bus.ts",
  "lib/data-import/core/template-compatibility.ts",
  "lib/data-import/core/merge-policy.ts",
  "lib/data-import/core/workbook-builder.server.ts",
  "lib/data-import/core/workbook-styler.server.ts",
  "lib/data-import/registry/import-export-registry.ts",
  "lib/data-import/adapters/spreadsheet-data-source.server.ts",
  "lib/data-import/adapters/excel-export-sink.server.ts",
  "components/data-import/data-import-export-toolbar.tsx",
  "supabase/migrations/20260910170000_import_export_framework_v3.sql",
];

for (const rel of V3_CORE) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
}

const registrySrc = fs.readFileSync(path.join(ROOT, "lib/data-import/registry/import-export-registry.ts"), "utf8");
assert.match(registrySrc, /ImportExportRegistry/);
assert.match(registrySrc, /registerV3EntityProviders/);
assert.match(registrySrc, /ensureImportExportFrameworkBootstrapped/);

const clientSrc = fs.readFileSync(path.join(ROOT, "lib/data-import/import-registry-client.ts"), "utf8");
assert.match(clientSrc, /ordini_fornitori:\s*"ordini-fornitori"/);

for (const view of [
  "components/gestionale/mezzi/mezzi-view.tsx",
  "components/preventivi/preventivi-view.tsx",
  "components/gestionale/magazzino/magazzino-view.tsx",
  "components/fatturazione/fatturazione-view.tsx",
  "components/ordini-fornitori/ordini-fornitori-view.tsx",
  "components/gestionale/lavorazioni/lavorazioni-page-toolbar.tsx",
]) {
  const src = fs.readFileSync(path.join(ROOT, view), "utf8");
  assert.match(src, /DataImportExportToolbar/, `${view} should wire DataImportExportToolbar`);
}

console.log("import-export-registry-v3.test.ts OK");
