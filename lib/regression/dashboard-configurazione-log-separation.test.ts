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

const dashLogStorage = read("lib/dashboard/dashboard-sistema-log-storage.ts");
const settingsWorkspace = read("components/dashboard/settings/settings-workspace-shell.tsx");
const impostazioniModal = read("components/dashboard/sistema-impostazioni-modal.tsx");
const dashboardView = read("components/dashboard/dashboard-view.tsx");
const dashLogSection = read("components/dashboard/dashboard-sistema-log-section.tsx");
const impostazioniPage = read("app/(gestionale)/impostazioni/page.tsx");

assert.doesNotMatch(dashLogStorage, /appendDashboardSettings/);
assert.doesNotMatch(dashLogStorage, /MODIFICA IMPOSTAZIONI/);

assert.match(settingsWorkspace, /appendConfigurazioneLogs/);
assert.doesNotMatch(settingsWorkspace, /appendDashboardSistemaLog/);
assert.doesNotMatch(impostazioniModal, /appendDashboardSistemaLog/);

assert.match(dashboardView, /DashboardSistemaLogListEmbedded/);
assert.doesNotMatch(dashboardView, /ConfigurazioneLogListEmbedded/);

assert.match(dashLogSection, /migrateLegacyDashboardSettingsLogsToConfigurazione/);

assert.match(impostazioniPage, /components\/configurazione\/sistema-impostazioni-page/);

console.log("dashboard-configurazione-log-separation.test.ts: OK");
