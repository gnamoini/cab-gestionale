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

const preventivoEditorSources = [
  "components/preventivi/preventivi-editor-modal.tsx",
  "components/preventivi/preventivo-lavorazioni-editor-section.tsx",
  "components/preventivi/preventivo-ricambi-editor-section.tsx",
  "components/preventivi/preventivo-riepilogo-note-section.tsx",
  "components/preventivi/preventivo-editor-totals.tsx",
]
  .map(read)
  .join("\n");

assert.doesNotMatch(preventiviSources, /type="date"/);
assert.doesNotMatch(preventiviSources, /<select\b/);
assert.doesNotMatch(preventiviSources, /<datalist\b/);

const editor = read("components/preventivi/preventivi-editor-modal.tsx");
const filters = read("components/preventivi/preventivi-advanced-filter-panel.tsx");
const view = read("components/preventivi/preventivi-view.tsx");

assert.match(preventiviSources, /aria-label=\{`Codice OE riga \$\{idx \+ 1\}`\}/);
assert.match(preventiviSources, /aria-label=\{`Unità di misura riga \$\{rowIndex \+ 1\}`\}/);
assert.match(preventivoEditorSources, /GestionaleNumericField/);
assert.match(preventivoEditorSources, /GestionaleQuantityField/);
assert.doesNotMatch(preventivoEditorSources, /type="number"/);
assert.match(preventiviSources, /preventivo-collaudo-prezzo/);
assert.match(preventiviSources, /PreventivoEditorTotalBar/);
assert.match(preventiviSources, /role="region"/);
assert.match(editor, /htmlFor=\{dataCreazioneFieldId\}/);
assert.match(preventiviSources, /htmlFor=\{noteFieldId\}/);
assert.match(editor, /GestionaleModalScrollBody/);
assert.match(editor, /preventivoEditorActionBtn/);
assert.match(editor, /preventivoEditorFooterBtnNeutral/);
assert.match(editor, /GestionaleCollapsibleSection title="Dati documento"/);
assert.match(preventivoEditorSources, /preventivo-editor-ui/);

assert.doesNotMatch(preventivoEditorSources, /text-\[11px\]/);
assert.doesNotMatch(preventivoEditorSources, /ds-radius-md/);
assert.doesNotMatch(preventivoEditorSources, /kpiLabelClass/);
assert.doesNotMatch(preventivoEditorSources, /className=\{dsBtnNeutral\}/);
assert.doesNotMatch(preventivoEditorSources, /`\$\{dsBtnNeutral\}/);

const ricambi = read("components/preventivi/preventivo-ricambi-editor-section.tsx");
assert.match(ricambi, /preventivoEditorTableInput/);
assert.match(ricambi, /RicambioUnitaMisuraPicker/);
assert.doesNotMatch(ricambi, /dsSegmentedWrap/);

const lavorazioni = read("components/preventivi/preventivo-lavorazioni-editor-section.tsx");
assert.match(lavorazioni, /preventivoEditorAddRowBtn/);
assert.match(lavorazioni, /Aggiungi addetto/);
assert.match(lavorazioni, /ORE_PREVENTIVO_ADDETTO_PRESET/);
assert.doesNotMatch(lavorazioni, /preventivoEditorActionBtn/);

assert.match(filters, /htmlFor="prev-filter-data-da"/);
assert.match(filters, /id="prev-filter-data-a"/);

assert.match(view, /GestionaleListSearchField/);
assert.match(view, /id="preventivi-search"/);

console.log("preventivi-inputs-audit.test.ts OK");
