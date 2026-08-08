import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPrefetchRoutesForScope } from "@/lib/render/query-ownership-registry";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const page = read("app/(gestionale)/impostazioni/page.tsx");
const deferred = read("components/gestionale/impostazioni/impostazioni-deferred-hydration.tsx");
const prefetch = read("src/lib/react-query/prefetch-gestionale-page.ts");
const settingsFetch = read("lib/app-settings/app-settings-fetch-server.ts");
const settingsHook = read("src/hooks/gestionale/use-settings-queries.ts");
const impostazioniHook = read("src/hooks/gestionale/use-impostazioni-settings-query.ts");
const shell = read("components/dashboard/settings/settings-workspace-shell.tsx");
const loaders = read("components/dashboard/settings/settings-section-loaders.tsx");
const inUsoPrefetch = read("lib/app-settings/prefetch-impostazioni-in-uso-queries.ts");
const similarGate = read("components/dashboard/use-settings-similar-gate.tsx");
const budget = read("lib/performance/performance-budget-registry.ts");
const gestionaleLayout = read("app/(gestionale)/layout.tsx");
const layout = read("app/(gestionale)/impostazioni/layout.tsx");

assert.match(page, /prefetchGestionalePage\(qc, "impostazioni"\)/);
assert.match(gestionaleLayout, /prefetchGestionaleLayoutSettings/);
assert.match(page, /SistemaImpostazioniPageViewLazy/);
assert.match(page, /GestionaleHydrationBoundary/);
assert.doesNotMatch(page, /prefetchImpostazioniPage\(\)/);

assert.match(deferred, /prefetchDeferredPage\(qc, "impostazioni"\)/);

const prefetchCritical =
  prefetch.split("export async function prefetchCriticalPage")[1]?.split("export async function prefetchGestionaleLayoutSettings")[0] ?? "";
assert.doesNotMatch(prefetchCritical, /prefetchSettingsPayload/);
assert.match(prefetchCritical, /case "impostazioni":/);

const prefetchDeferred = prefetch.split("export async function prefetchDeferredPage")[1] ?? "";
const impBlock = prefetchDeferred.split('case "impostazioni":')[1]?.split('case "')[0] ?? "";
assert.match(impBlock, /prefetchSettingsPayload/);
assert.match(impBlock, /getAppSettingsPayloadServer/);

assert.match(settingsFetch, /verifyServerPageWrite\("impostazioni"\)/);
assert.match(settingsFetch, /cache\(/);

assert.match(settingsHook, /hasHydratedPayload/);
assert.match(settingsHook, /refetchOnMount: false/);

assert.match(impostazioniHook, /useImpostazioniSettingsQuery/);
assert.match(impostazioniHook, /tier: "static"/);

assert.match(shell, /useImpostazioniSettingsQuery/);
assert.match(shell, /needsStatiInUso/);
assert.match(shell, /needsAddettiInUso/);
assert.match(shell, /prefetchImpostazioniInUsoQueries/);
assert.match(shell, /SettingsLavorazioniModalLazy/);
assert.match(shell, /SettingsEliminaConfirmDialogLazy/);
assert.match(shell, /SettingsRinominaPropagaDialogLazy/);
assert.match(shell, /ConfigurazioneLogListEmbeddedLazy/);

assert.match(loaders, /loadSettingsSection/);
assert.match(loaders, /"sys-panoramica"/);
assert.match(loaders, /SettingsOverviewSectionLazy/);
assert.match(loaders, /SettingsClientiCommercialiListLazy/);
assert.match(loaders, /SettingsMaintenancePlansSectionLazy/);

assert.match(inUsoPrefetch, /prefetchImpostazioniInUsoQueries/);
assert.match(inUsoPrefetch, /stati-in-uso/);
assert.match(inUsoPrefetch, /addetti-in-uso/);

assert.match(similarGate, /dynamic\s*\(/);
assert.match(similarGate, /SettingsSimileConfirmDialog/);

assert.match(budget, /route: "\/impostazioni"/);
assert.match(budget, /settings\.payload/);

assert.match(layout, /verifyServerPageWrite/);

const impRoutes = getPrefetchRoutesForScope("settings.payload");
assert.ok(impRoutes.includes("/impostazioni"), "settings.payload must prefetch on /impostazioni");

console.log("impostazioni-perf-policy.test.ts OK");
