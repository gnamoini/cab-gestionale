import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const CORE_FILES = [
  "lib/data-import/core/import-plugin.ts",
  "lib/data-import/core/template-generator.server.ts",
  "lib/data-import/core/import-runner.server.ts",
  "lib/data-import/core/relation-resolver.server.ts",
  "lib/data-import/core/export-plugin.ts",
  "lib/data-import/core/export-runner.server.ts",
  "lib/data-import/core/import-api-router.server.ts",
  "lib/data-import/registry.ts",
];

for (const rel of CORE_FILES) {
  assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
}

const PLUGIN_FILES = [
  "lib/data-import/entities/magazzino/magazzino-import.plugin.server.ts",
  "lib/data-import/entities/clienti/clienti-import.plugin.server.ts",
  "lib/data-import/entities/listino/listino-import.plugin.server.ts",
  "lib/data-import/entities/mezzi/mezzi-import.plugin.server.ts",
  "lib/data-import/entities/preventivi/preventivi-import.plugin.server.ts",
  "lib/data-import/entities/settings-list/settings-list-import.plugin.server.ts",
  "lib/data-import/entities/settings-hierarchy/settings-hierarchy-import.plugin.server.ts",
  "lib/data-import/entities/stubs/import-stub-plugins.server.ts",
];

for (const rel of PLUGIN_FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  assert.match(src, /\bfields\b/, `${rel}: fields`);
  assert.match(src, /supportedStrategies/, `${rel}: supportedStrategies`);
  assert.match(src, /defaultStrategy/, `${rel}: defaultStrategy`);
}

const registrySrc = fs.readFileSync(path.join(ROOT, "lib/data-import/registry.ts"), "utf8");
const directRegisters = (registrySrc.match(/register\(/g) ?? []).length;
assert.match(registrySrc, /for \(const p of SETTINGS_LIST_PLUGINS\) register\(p\)/);
assert.ok(directRegisters >= 13, `Expected >= 13 direct register() calls, got ${directRegisters}`);

const settingsListSrc = fs.readFileSync(
  path.join(ROOT, "lib/data-import/entities/settings-list/settings-list-import.plugin.server.ts"),
  "utf8",
);
const settingsListIds = [...settingsListSrc.matchAll(/id:\s*"settings_[^"]+"/g)].map((m) => m[0]);
assert.ok(settingsListIds.length >= 7, `Expected >= 7 settings_list instances, got ${settingsListIds.length}`);

const stubSrc = fs.readFileSync(
  path.join(ROOT, "lib/data-import/entities/stubs/import-stub-plugins.server.ts"),
  "utf8",
);
assert.match(stubSrc, /lavorazioniImportPluginStub/);
assert.match(stubSrc, /fattureDraftImportPluginStub/);
assert.match(stubSrc, /billingCustomersImportPluginStub/);
assert.match(stubSrc, /documentiMetadataImportPluginStub/);
assert.match(stubSrc, /dipendentiTimesheetImportPluginStub/);
assert.match(stubSrc, /status:\s*"stub"/);

console.log(`import-registry.test.ts OK (${directRegisters} direct + settings_list loop)`);
