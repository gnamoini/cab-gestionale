/**
 * Audit mezzi: pattern input portal, a11y filtri/form, no controlli nativi OS.
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

const mezziSources = readDirRecursive(path.join(ROOT, "components/gestionale/mezzi")).join("\n");

assert.doesNotMatch(mezziSources, /type="date"/);
assert.doesNotMatch(mezziSources, /<select\b/);
assert.doesNotMatch(mezziSources, /<datalist\b/);

const filters = read("components/gestionale/mezzi/mezzi-filters.tsx");
const view = read("components/gestionale/mezzi/mezzi-view.tsx");

assert.match(filters, /htmlFor="mezzi-filter-cliente"/);
assert.match(filters, /id="mezzi-filter-ultima-lav"/);
assert.match(filters, /GlobalSelect/);
assert.match(filters, /GestionaleSearchField/);
assert.match(filters, /id="mezzi-search"/);
assert.match(filters, /aria-label="Cerca mezzi"/);
assert.match(filters, /min-h-11/);

assert.match(view, /htmlFor="mezzo-form-matricola"/);
assert.match(view, /id="mezzo-form-cliente"/);
assert.match(view, /inputMode="numeric"/);
assert.match(view, /GestionaleModalScrollBody/);
assert.match(view, /MezzoFormFields/);

console.log("mezzi-inputs-audit.test.ts OK");
