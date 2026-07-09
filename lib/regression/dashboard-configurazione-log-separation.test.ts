/**
 * Dashboard vs Configurazione: log separati, nessun salvataggio impostazioni nel log dashboard.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const settingsWorkspace = read("components/dashboard/settings/settings-workspace-shell.tsx");
const impostazioniModal = read("components/dashboard/sistema-impostazioni-modal.tsx");
const dashboardView = read("components/dashboard/dashboard-view.tsx");
const impostazioniPage = read("app/(gestionale)/impostazioni/page.tsx");

assert.match(settingsWorkspace, /appendConfigurazioneLogs/);
assert.doesNotMatch(settingsWorkspace, /appendDashboardSistemaLog/);
assert.doesNotMatch(impostazioniModal, /appendDashboardSistemaLog/);

assert.doesNotMatch(dashboardView, /GestionalePageToolbarActions|DashboardSistemaLogListEmbedded|onOpenLog/);
assert.doesNotMatch(dashboardView, /ConfigurazioneLogListEmbedded/);

assert.match(impostazioniPage, /SistemaImpostazioniPageViewLazy/);

console.log("dashboard-configurazione-log-separation.test.ts: OK");
