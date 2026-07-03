/**
 * Audit statico modal/overlay pagina Impostazioni — handler, dialog SSOT, rename propagation post-save.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const shell = read("components/dashboard/settings/settings-workspace-shell.tsx");
const eliminaDlg = read("components/dashboard/settings-elimina-confirm-dialog.tsx");
const propagaDlg = read("components/dashboard/settings-rinomina-propaga-dialog.tsx");
const simileDlg = read("components/dashboard/settings-simile-confirm-dialog.tsx");
const unsavedDlg = read("components/gestionale/gestionale-unsaved-changes-dialog.tsx");

// Workspace monta tutti gli overlay canonici pagina
assert.match(shell, /SettingsEliminaConfirmDialog/);
assert.match(shell, /SettingsRinominaPropagaDialog/);
assert.match(shell, /GestionaleUnsavedChangesDialog/);
assert.match(shell, /addettiSimilarDialog/);
assert.match(shell, /<Drawer/);
assert.match(shell, /ConfigurazioneLogListEmbedded/);

// Toolbar save / unsaved / propaga
assert.match(shell, /handleSaveNow/);
assert.match(shell, /handleUnsavedSaveAndExit/);
assert.match(shell, /finalizePropaga/);
assert.match(shell, /queueRename/);

// Bug fix: coda rename non svuotata in persistSnapshot (dialog propaga post-save)
assert.match(shell, /finalizePropaga after user choice/);
assert.doesNotMatch(
  shell,
  /syncBranding\(nextBranding\);\s*\n\s*renameQueueRef\.current = \[\];\s*\n\s*return true/,
);

// Dialog wrappers usano GestionaleConfirmDialog SSOT
for (const [name, src] of [
  ["elimina", eliminaDlg],
  ["propaga", propagaDlg],
  ["simile", simileDlg],
] as const) {
  assert.match(src, /GestionaleConfirmDialog/, `${name} dialog must use GestionaleConfirmDialog`);
}

assert.match(eliminaDlg, /destructive/);
assert.match(eliminaDlg, /cancelLabel="Annulla"/);
assert.match(propagaDlg, /Solo configurazione/);
assert.match(propagaDlg, /Propaga ovunque/);
assert.match(simileDlg, /Inserisci comunque/);
assert.match(unsavedDlg, /Salva ed esci/);

// Liste figlie montano dialog elimina/simile
const listFiles = [
  "components/dashboard/settings/settings-unified-string-list.tsx",
  "components/dashboard/settings/settings-magazzino-marche-list.tsx",
  "components/dashboard/hierarchy-tree-settings-section.tsx",
];
for (const rel of listFiles) {
  const src = read(rel);
  assert.match(src, /SettingsEliminaConfirmDialog/, rel);
  assert.match(src, /useSettingsSimilarGate|similarDialog/, rel);
}

// Branding: azioni inline (persistenza al Salva pagina)
const branding = read("components/dashboard/settings-branding-section.tsx");
assert.match(branding, /Carica logo/);
assert.match(branding, /Ripristina branding originale/);
assert.match(branding, /onResetBranding/);

console.log("settings-modals-audit.test.ts OK");
