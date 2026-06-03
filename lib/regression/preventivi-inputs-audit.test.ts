/**
 * Audit preventivi: pattern input portal, a11y ricambi, no controlli nativi OS.
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

const preventiviSources = readDirRecursive(path.join(ROOT, "components/preventivi")).join("\n");

assert.doesNotMatch(preventiviSources, /type="date"/);
assert.doesNotMatch(preventiviSources, /<select\b/);
assert.doesNotMatch(preventiviSources, /<datalist\b/);

const editor = read("components/preventivi/preventivi-editor-modal.tsx");
const filters = read("components/preventivi/preventivi-advanced-filter-panel.tsx");
const view = read("components/preventivi/preventivi-view.tsx");

assert.match(editor, /aria-label=\{`Codice OE riga \$\{idx \+ 1\}`\}/);
assert.match(editor, /inputMode="decimal"/);
assert.match(editor, /preventivo-collaudo-prezzo/);
assert.match(editor, /htmlFor=\{dataCreazioneFieldId\}/);
assert.match(editor, /GestionaleModalScrollBody/);
assert.match(editor, /role="region"/);

assert.match(filters, /htmlFor="prev-filter-data-da"/);
assert.match(filters, /id="prev-filter-data-a"/);

assert.match(view, /GestionaleListSearchField/);
assert.match(view, /id="preventivi-search"/);

console.log("preventivi-inputs-audit.test.ts OK");
