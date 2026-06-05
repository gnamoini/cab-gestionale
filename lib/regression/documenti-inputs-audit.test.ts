/**
 * Audit documenti: pattern input portal, a11y filtri/modali, no controlli nativi OS.
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

const documentiSources = readDirRecursive(path.join(ROOT, "components/gestionale/documenti")).join("\n");

assert.doesNotMatch(documentiSources, /type="date"/);
assert.doesNotMatch(documentiSources, /<select\b/);
assert.doesNotMatch(documentiSources, /<datalist\b/);

const filters = read("components/gestionale/documenti/documenti-advanced-filter-panel.tsx");
const modals = read("components/gestionale/documenti/documenti-modals.tsx");
const dropzone = read("components/gestionale/documenti/documento-file-dropzone.tsx");
const view = read("components/gestionale/documenti/documenti-view.tsx");

assert.match(filters, /aria-pressed=\{on\}/);
assert.match(filters, /htmlFor="doc-filter-sort"/);
assert.match(filters, /id="doc-filter-sort"/);
assert.match(filters, /min-h-11/);

assert.match(modals, /htmlFor="doc-upload-nome"/);
assert.match(modals, /id="doc-upload-categoria"/);
assert.match(modals, /htmlFor="doc-edit-note"/);
assert.match(modals, /id="doc-edit-nome"/);
assert.match(modals, /GestionaleModalScrollBody/);
assert.doesNotMatch(modals, /max-w-lg/);
assert.match(modals, /resolveModalMaxWidthClass/);
assert.match(modals, /max-w-2xl/);

assert.match(dropzone, /id="doc-upload-file"/);
assert.match(dropzone, /htmlFor="doc-upload-file"/);

assert.match(view, /GestionaleSearchField/);
assert.match(view, /aria-label="Cerca documenti"/);

console.log("documenti-inputs-audit.test.ts OK");
