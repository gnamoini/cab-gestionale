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
const invalidateRelated = read("src/lib/react-query/invalidate-related.ts");

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

// Propagation pipeline: mutex, snapshot, finally, labels
assert.match(shell, /propagaInFlightRef/);
assert.match(shell, /propagaInFlightRef\.current = true[\s\S]*setPropagaPending\(true\)/);
assert.match(shell, /const queue = \[\.\.\.renameQueueRef\.current\]/);
assert.match(shell, /finally \{[\s\S]*setPropagaPending\(false\)[\s\S]*propagaInFlightRef\.current = false/);
assert.match(shell, /labelsForRenameKind\(entry\.kind\)/);
assert.doesNotMatch(shell, /existingLabels: liste\.clienti/);
assert.doesNotMatch(shell, /runRenameJob\([\s\S]*forEach\(async/);
assert.doesNotMatch(shell, /\.map\(async[\s\S]*runRenameJob/);
assert.match(shell, /for \(let i = 0; i < queue\.length; i \+= 1\)[\s\S]*await[\s\S]*runRenameJob/);
assert.match(shell, /withRenamePropagationTimeout/);
assert.match(shell, /flattenHierarchyRenameLabels/);
assert.match(shell, /case "addetto":/);

const renameKinds = [
  "cliente",
  "utilizzatore",
  "cantiere",
  "addetto",
  "mag_marca",
  "mag_categoria",
  "mag_fornitore",
  "mag_produttore",
  "tipo_attrezzatura",
  "tipo_telaio",
  "hierarchy_marca_attrezzature",
  "hierarchy_modello_attrezzature",
  "hierarchy_marca_telai",
  "hierarchy_modello_telai",
] as const;
for (const kind of renameKinds) {
  assert.match(shell, new RegExp(`case "${kind}"`), `labelsForRenameKind must handle ${kind}`);
}

// Success path: invalidate before close
assert.match(shell, /invalidateAfterSettingsRenamePropagation\(queryClient, propagatedKinds\)/);

// Error path surfaces inline message + retry affordance in dialog
assert.match(shell, /setPropagaError\(message\)/);
assert.match(shell, /propagaError/);

// Invalidate chain: no saveNow / queueRename in invalidate helper
assert.doesNotMatch(invalidateRelated, /saveNow|queueRename|setPropagaOpen/);

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
assert.match(propagaDlg, /Propaga dati live/);
assert.match(propagaDlg, /Riprova/);
assert.match(propagaDlg, /progressLabel/);
assert.match(propagaDlg, /errorMessage/);
assert.match(propagaDlg, /impactSummaries/);
assert.match(shell, /settingsRenameEngineEntry/);
assert.match(shell, /propagaImpacts/);
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
