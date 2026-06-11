/**
 * SSOT textarea gestionale: un solo componente, niente textarea raw nei form.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SSOT_FILE = "components/gestionale/gestionale-textarea.tsx";

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function listTsxUnder(dir: string): string[] {
  const out: string[] = [];
  function walk(abs: string) {
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const full = path.join(abs, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".next") continue;
        walk(full);
      } else if (ent.isFile() && ent.name.endsWith(".tsx")) {
        out.push(path.relative(ROOT, full).replace(/\\/g, "/"));
      }
    }
  }
  walk(path.join(ROOT, dir));
  return out.sort();
}

const ssotSrc = read(SSOT_FILE);
assert.match(ssotSrc, /gestionaleMultilineEnterProps/);
assert.match(ssotSrc, /dsTextarea/);
assert.match(ssotSrc, /forwardRef/);
assert.match(ssotSrc, /autoGrow = true/);
assert.match(ssotSrc, /gestionaleTextareaMaxHeightDefault/);
assert.match(ssotSrc, /data-cab-auto-grow/);
assert.match(ssotSrc, /syncTextareaAutoGrowHeight/);
assert.match(ssotSrc, /el\.style\.overflowY = ""/);

const designSystem = read("lib/ui/design-system.ts");
assert.match(designSystem, /gestionale-textarea/);
assert.match(designSystem, /resize-none/);
assert.match(designSystem, /gestionaleTextareaMaxHeightDefault/);
assert.match(designSystem, /gestionaleTextareaMaxHeightCompact/);

const globals = read("app/globals.css");
assert.match(globals, /\.gestionale-textarea/);
assert.match(globals, /field-sizing:\s*content/);
assert.match(globals, /data-cab-auto-grow/);
assert.match(ssotSrc, /data-cab-textarea-scrollable/);
assert.match(globals, /data-cab-textarea-scrollable/);
assert.match(globals, /field-sizing:\s*fixed/);
assert.match(globals, /scrollbar-gutter:\s*stable/);

const componentsDir = listTsxUnder("components");
const rawTextareaFiles: string[] = [];
for (const rel of componentsDir) {
  if (rel === SSOT_FILE) continue;
  const src = read(rel);
  if (/<textarea\b/.test(src)) rawTextareaFiles.push(rel);
}

assert.equal(
  rawTextareaFiles.length,
  0,
  `raw <textarea> must only exist in ${SSOT_FILE}; found in: ${rawTextareaFiles.join(", ")}`,
);

const migratedSamples = [
  "components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx",
  "components/gestionale/magazzino/ricambio-form-fields.tsx",
  "components/lavorazioni/schede/schede-lavorazione-modal.tsx",
  "components/bunder/bunder-editor-modal.tsx",
  "components/gestionale/documenti/documenti-modals.tsx",
] as const;

for (const rel of migratedSamples) {
  const src = read(rel);
  assert.match(src, /GestionaleTextarea/, `${rel} must use GestionaleTextarea`);
  assert.doesNotMatch(src, /<textarea\b/, `${rel} must not use raw textarea`);
}

console.log("gestionale-textarea-ssot-audit.test.ts OK");
