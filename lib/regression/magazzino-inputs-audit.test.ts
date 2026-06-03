/**
 * Audit magazzino: pattern input portal, a11y form, no controlli nativi OS.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function readDirRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...readDirRecursive(full));
    else if (ent.name.endsWith(".tsx") || ent.name.endsWith(".ts")) out.push(fs.readFileSync(full, "utf8"));
  }
  return out;
}

const magazzinoDir = path.join(ROOT, "components/gestionale/magazzino");
const magazzinoSources = readDirRecursive(magazzinoDir).join("\n");

assert.doesNotMatch(magazzinoSources, /type="date"/);
assert.doesNotMatch(magazzinoSources, /<select\b/);
assert.doesNotMatch(magazzinoSources, /<datalist\b/);

const formFields = read("components/gestionale/magazzino/ricambio-form-fields.tsx");
const filters = read("components/gestionale/magazzino/magazzino-advanced-filter-panel.tsx");
const view = read("components/gestionale/magazzino/magazzino-view.tsx");
const multiSelect = read("components/gestionale/global-input/global-multi-select.tsx");

assert.match(formFields, /htmlFor/);
assert.match(formFields, /magazzino-ricambio-codice-oe/);
assert.match(formFields, /inputMode="numeric"/);
assert.match(formFields, /function RicambioField/);

assert.match(filters, /GlobalSelect/);
assert.match(filters, /GlobalSettingsListSelect/);
assert.match(filters, /htmlFor="mag-filter-marca-ricambio"/);
assert.match(filters, /id="mag-filter-categoria"/);

assert.match(view, /GestionaleModalScrollBody/);
assert.match(view, /GestionaleListSearchField/);
assert.match(view, /id="magazzino-search"/);

assert.match(multiSelect, /aria-label=\{`Rimuovi \$\{s\.label/);

console.log("magazzino-inputs-audit.test.ts OK");
