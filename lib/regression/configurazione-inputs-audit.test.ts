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

const settingsWorkspace = read("components/dashboard/settings/settings-workspace-shell.tsx");
const settingsNav = read("components/dashboard/settings/settings-nav-shell.tsx");
const settingsUnifiedList = read("components/dashboard/settings/settings-unified-string-list.tsx");
const settingsClienti = read("components/dashboard/settings/settings-clienti-list.tsx");
const settingsMarche = read("components/dashboard/settings/settings-magazzino-marche-list.tsx");
const lavorazioniSettings = read("components/gestionale/lavorazioni/lavorazioni-settings-ui.tsx");
const lavorazioniModals = read("components/gestionale/lavorazioni/lavorazioni-modals.tsx");
const colorPicker = read("components/gestionale/settings-color-picker-popover.tsx");
const listUi = read("components/dashboard/settings-list-ui.tsx");
const assenze = read("components/dashboard/settings-dipendenti-assenze-section.tsx");
const hierarchy = read("components/dashboard/hierarchy-tree-settings-section.tsx");

/** Solo sorgenti impostazioni/configurazione — esclude moduli dashboard non-settings (es. promemoria). */
const configSources = [
  settingsWorkspace,
  settingsNav,
  settingsUnifiedList,
  settingsClienti,
  settingsMarche,
  listUi,
  assenze,
  hierarchy,
  lavorazioniSettings,
  lavorazioniModals,
  colorPicker,
].join("\n");

assert.doesNotMatch(configSources, /type="date"/);
assert.doesNotMatch(configSources, /<select\b/);
assert.doesNotMatch(configSources, /<datalist\b/);

assert.match(settingsUnifiedList, /addAriaLabel/);
assert.match(settingsClienti, /inputAriaLabel="Nuovo cliente"/);
assert.match(settingsMarche, /inputAriaLabel="Nuova marca"/);
assert.match(settingsWorkspace, /htmlFor="config-costo-orario-default"/);
assert.match(settingsClienti, /settingsConfigFieldId\("config-sconto-cliente"/);
assert.match(settingsWorkspace, /inputMode="decimal"/);
assert.match(settingsNav, /aria-current=\{active \? "true" : undefined\}/);
assert.match(settingsNav, /SettingsMainPanel/);
assert.match(settingsNav, /GestionaleModalScrollBody/);
assert.match(settingsWorkspace, /SettingsMainPanel/);

assert.match(listUi, /min-h-10/);

assert.match(lavorazioniSettings, /aria-label=\{`Stato finale workflow per/);
assert.match(lavorazioniSettings, /aria-label=\{`Nome stato \$\{s\.label/);
assert.match(lavorazioniModals, /aria-label=\{`Priorità \$\{prioritaLabel\(p\)\}: attiva`\}/);

assert.match(assenze, /SETTINGS_LIST_INPUT/);
assert.match(assenze, /inputMode="text"/);

assert.match(hierarchy, /min-h-10/);

assert.match(colorPicker, /aria-label=\{ariaLabel\}/);

console.log("configurazione-inputs-audit.test.ts OK");
