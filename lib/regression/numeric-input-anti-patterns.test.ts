/**
 * Audit anti-pattern input numerici — pattern mirati su scope operativo.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const SCOPED_FILES = [
  "components/lavorazioni/schede/scheda-ricambi-form-body.tsx",
  "components/lavorazioni/schede/schede-lavorazione-modal.tsx",
  "components/lavorazioni/schede/scheda-form-utils.tsx",
  "components/preventivi/preventivo-ricambi-editor-section.tsx",
  "components/preventivi/preventivo-lavorazioni-editor-section.tsx",
];

const ANTI_PATTERNS: { name: string; regex: RegExp }[] = [
  {
    name: "parseFloat+fallback in onChange",
    regex: /onChange=\{[^}]*parseFloat\([^)]*\.value[^)]*\)\s*\|\|/,
  },
  {
    name: "Number(target.value) in onChange",
    regex: /onChange=\{[^}]*Number\([^)]*\.value[^)]*\)/,
  },
  {
    name: "Math clamp in onChange with target.value",
    regex: /onChange=\{[^}]*Math\.(max|min|round)\([^}]*\.value/,
  },
];

for (const rel of SCOPED_FILES) {
  const src = read(rel);
  for (const { name, regex } of ANTI_PATTERNS) {
    assert.doesNotMatch(
      src,
      regex,
      `${rel}: forbidden numeric anti-pattern "${name}"`,
    );
  }
  assert.doesNotMatch(
    src,
    /type="number"/,
    `${rel}: use type="text" per numeric UX contract`,
  );
}

const ricambioForm = read("components/gestionale/magazzino/ricambio-form-fields.tsx");
assert.match(ricambioForm, /type="text"/, "StockStepper should use type=text after migration");

const fornitori = read("components/gestionale/magazzino/ricambio-fornitori-alternativi-editor.tsx");
assert.match(fornitori, /GestionaleNumberInput/, "fornitori alternativi should use GestionaleNumberInput");

const contract = read("docs/ui/numeric-input-contract.md");
assert.match(contract, /type="text"/);
assert.match(contract, /commitNumericDraft/);

const numberInput = read("components/gestionale/gestionale-number-input.tsx");
assert.doesNotMatch(numberInput, /\.select\(\)/, "GestionaleNumberInput: no select() on focus");
assert.match(numberInput, /data-gestionale-numeric/);

const numericDraft = read("lib/ui/use-gestionale-numeric-draft.ts");
assert.doesNotMatch(numericDraft, /\.select\(\)/, "useGestionaleNumericDraft: no select() on focus");

console.log("numeric-input-anti-patterns.test.ts OK");
