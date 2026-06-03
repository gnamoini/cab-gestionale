/**
 * Audit bunder: pattern input portal, a11y filtri/editor, no controlli nativi OS.
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

const bunderSources = readDirRecursive(path.join(ROOT, "components/bunder")).join("\n");

assert.doesNotMatch(bunderSources, /type="date"/);
assert.doesNotMatch(bunderSources, /<select\b/);
assert.doesNotMatch(bunderSources, /<datalist\b/);

const view = read("components/bunder/bunder-view.tsx");
const editor = read("components/bunder/bunder-editor-modal.tsx");

assert.match(view, /htmlFor="bunder-filter-tipo"/);
assert.match(view, /id="bunder-filter-data-da"/);
assert.match(view, /id="bunder-search"/);
assert.match(view, /GlobalDatePickerYmd/);
assert.match(view, /bunderFilterTextInputClass/);
assert.match(view, /inputMode="decimal"/);
assert.match(view, /htmlFor="bunder-wizard-tipo"/);

assert.match(editor, /GestionaleModalScrollBody/);
assert.match(editor, /htmlFor="bunder-edit-oggetto"/);
assert.match(editor, /aria-label=\{`Quantità riga \$\{idx \+ 1\}`\}/);
assert.match(editor, /inputMode="decimal"/);
assert.match(editor, /role="region"/);
assert.match(editor, /aria-readonly="true"/);

console.log("bunder-inputs-audit.test.ts OK");
