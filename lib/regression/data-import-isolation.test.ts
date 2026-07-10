import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

assert.ok(fs.existsSync(path.join(ROOT, "lib/data-import/core/parse-spreadsheet.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/data-import/registry.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/data-import/core/import-api-router.server.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "lib/data-import/core/import-runner.server.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "components/data-import/data-import-wizard-modal.tsx")));
assert.ok(fs.existsSync(path.join(ROOT, "components/data-import/data-import-entry.tsx")));
assert.ok(fs.existsSync(path.join(ROOT, "components/data-import/module-import-entry.tsx")));
assert.ok(fs.existsSync(path.join(ROOT, "app/api/import/[entity]/parse/route.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "app/api/import/[entity]/preview/route.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "app/api/import/[entity]/execute/route.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "app/api/import/[entity]/template/route.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "app/api/import/presets/route.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "app/api/export/[entity]/route.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "app/api/import/magazzino/parse/route.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "app/api/import/clienti/parse/route.ts")));
assert.ok(fs.existsSync(path.join(ROOT, "supabase/migrations/20260718120000_data_import_infrastructure.sql")));
assert.ok(fs.existsSync(path.join(ROOT, "supabase/migrations/20260719120000_import_entity_registry_expand.sql")));
assert.ok(fs.existsSync(path.join(ROOT, "docs/data-import-erp.md")));

const magLegacy = fs.readFileSync(path.join(ROOT, "app/api/import/magazzino/parse/route.ts"), "utf8");
assert.match(magLegacy, /legacyImportParseRoute/);

const magView = fs.readFileSync(path.join(ROOT, "components/gestionale/magazzino/magazzino-view.tsx"), "utf8");
assert.match(magView, /MagazzinoImportMenu/);

const magImportMenu = fs.readFileSync(path.join(ROOT, "components/gestionale/magazzino/magazzino-import-entry.tsx"), "utf8");
assert.match(magImportMenu, /listino_ricambi/);
assert.match(magImportMenu, /magazzino_ricambi/);

const mezziView = fs.readFileSync(path.join(ROOT, "components/gestionale/mezzi/mezzi-view.tsx"), "utf8");
assert.match(mezziView, /ModuleImportEntry/);

const preventiviView = fs.readFileSync(path.join(ROOT, "components/preventivi/preventivi-view.tsx"), "utf8");
assert.match(preventiviView, /ModuleImportEntry/);

const settingsShell = fs.readFileSync(path.join(ROOT, "components/dashboard/settings/settings-workspace-shell.tsx"), "utf8");
assert.match(settingsShell, /SettingsImportEntry/);
assert.match(settingsShell, /settings_addetti/);
assert.match(settingsShell, /settings_fornitori/);

const clientiList = fs.readFileSync(path.join(ROOT, "components/dashboard/settings/settings-clienti-list.tsx"), "utf8");
assert.match(clientiList, /ClientiImportEntry/);

console.log("data-import-isolation.test.ts OK");
