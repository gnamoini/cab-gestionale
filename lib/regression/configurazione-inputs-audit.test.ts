/**
 * Audit configurazione: a11y input, touch target, no controlli nativi OS.
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

const dashboardSources = readDirRecursive(path.join(ROOT, "components/dashboard")).join("\n");
const lavorazioniSettings = read("components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx");
const lavorazioniModals = read("components/gestionale/lavorazioni/lavorazioni-modals.tsx");
const colorPicker = read("components/gestionale/settings-color-picker-popover.tsx");

const configSources = `${dashboardSources}\n${lavorazioniSettings}\n${lavorazioniModals}\n${colorPicker}`;

assert.doesNotMatch(configSources, /type="date"/);
assert.doesNotMatch(configSources, /<select\b/);
assert.doesNotMatch(configSources, /<datalist\b/);

const sistema = read("components/dashboard/sistema-impostazioni-modal.tsx");
const listUi = read("components/dashboard/settings-list-ui.tsx");
const assenze = read("components/dashboard/settings-dipendenti-assenze-section.tsx");
const hierarchy = read("components/dashboard/hierarchy-tree-settings-section.tsx");

assert.match(sistema, /addAriaLabel/);
assert.match(sistema, /aria-label="Nuovo cliente"/);
assert.match(sistema, /aria-label="Nuova marca"/);
assert.match(sistema, /htmlFor="config-costo-orario-default"/);
assert.match(sistema, /configFieldId\("config-sconto-cliente"/);
assert.match(sistema, /inputMode="decimal"/);
assert.match(sistema, /aria-current=\{active \? "true" : undefined\}/);
assert.match(sistema, /SettingsMainPanel/);
assert.match(sistema, /GestionaleModalScrollBody/);

assert.match(listUi, /min-h-10/);

assert.match(lavorazioniSettings, /aria-label=\{`Stato finale workflow per/);
assert.match(lavorazioniSettings, /aria-label=\{`Nome stato \$\{s\.label/);
assert.match(lavorazioniModals, /aria-label=\{`Priorità \$\{prioritaLabel\(p\)\}: attiva`\}/);

assert.match(assenze, /min-h-10/);
assert.match(assenze, /inputMode="text"/);

assert.match(hierarchy, /min-h-10/);

assert.match(colorPicker, /aria-label=\{ariaLabel\}/);

console.log("configurazione-inputs-audit.test.ts OK");
