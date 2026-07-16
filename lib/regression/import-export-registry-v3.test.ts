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

const viewImportWiring: [string, RegExp][] = [
  ["components/gestionale/magazzino/magazzino-view.tsx", /useDataImportExportPageActions/],
  ["components/gestionale/mezzi/mezzi-view.tsx", /ModuleImportEntry/],
  ["components/preventivi/preventivi-view.tsx", /ModuleImportEntry/],
];
for (const [view, pattern] of viewImportWiring) {
  const src = fs.readFileSync(path.join(ROOT, view), "utf8");
  assert.match(src, pattern, `${view} should wire import/export UI`);
}

assert.match(
  fs.readFileSync(path.join(ROOT, "components/data-import/data-import-export-toolbar.tsx"), "utf8"),
  /useDataImportExportPageActions/,
);

console.log("import-export-registry-v3.test.ts OK");
